using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;

using CompleteHttp.Crypto;
using CompleteHttp.Tls;

namespace CompleteHttp;

internal static class Program
{
    private static async Task Main(string[] args)
    {
        int port = args.Length > 0 && int.TryParse(args[0], out int p) ? p : 1337;

        using X509Certificate2 certificate = CertificateProvider.CreateCertificate();

        var listener = new TcpListener(IPAddress.Any, port);
        listener.Start();
        Console.WriteLine($"listening on 0.0.0.0:{port}");

        while (true)
        {
            TcpClient client = await listener.AcceptTcpClientAsync();

            // Fire-and-forget: each connection gets its own task and its own
            // TlsConnection, so no shared mutable state and no locks.
            _ = HandleAsync(client, certificate);
        }
    }

    private static async Task HandleAsync(TcpClient client, X509Certificate2 certificate)
    {
        using (client)
        {
            client.NoDelay = true;

            await using NetworkStream stream = client.GetStream();
            using var conn = new TlsConnection(stream, certificate);

            try
            {
                await conn.HandshakeAsync(CancellationToken.None);
                await conn.ServeApplicationDataAsync(CancellationToken.None);
                await conn.SendAlertAsync(
                    AlertLevel.Warning, AlertDescription.CloseNotify, CancellationToken.None);
            }
            catch (TlsAlertException alert)
            {
                await TrySendAlertAsync(conn, alert.Level, alert.Description);
            }
            catch (IOException)
            {
                // peer vanished mid-record; nothing to say and nowhere to say it
            }
            catch (Exception ex)
            {
                Console.WriteLine($"internal error: {ex.Message}");
                await TrySendAlertAsync(conn, AlertLevel.Fatal, AlertDescription.InternalError);
            }
        }
    }

    /// <summary>Best-effort alert on a connection that may already be dead.</summary>
    private static async Task TrySendAlertAsync(
        TlsConnection conn, AlertLevel level, AlertDescription description)
    {
        try
        {
            await conn.SendAlertAsync(level, description, CancellationToken.None);
        }
        catch
        {
            // The peer is gone or the record layer isn't up. Either way, closing.
        }
    }
}
