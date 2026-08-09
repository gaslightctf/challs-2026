namespace CompleteHttp.Tls;

/// <summary>
/// Growable buffer for building wire structures, mirroring <see cref="TlsReader"/>.
/// Nested vectors are built as their own writer and handed to WriteVector*.
/// </summary>
internal sealed class TlsWriter
{
    private readonly List<byte> _buffer = new(64);

    public int Length => _buffer.Count;

    public void WriteUInt8(byte value) => _buffer.Add(value);

    public void WriteUInt16(ushort value)
    {
        _buffer.Add((byte)(value >> 8));
        _buffer.Add((byte)value);
    }

    public void WriteUInt24(int value)
    {
        _buffer.Add((byte)(value >> 16));
        _buffer.Add((byte)(value >> 8));
        _buffer.Add((byte)value);
    }

    public void WriteBytes(ReadOnlySpan<byte> value) => _buffer.AddRange(value);

    /// <summary>Writes a vector with a one-byte length prefix.</summary>
    public void WriteVector8(ReadOnlySpan<byte> value)
    {
        WriteUInt8(checked((byte)value.Length));
        WriteBytes(value);
    }

    /// <summary>Writes a vector with a two-byte length prefix.</summary>
    public void WriteVector16(ReadOnlySpan<byte> value)
    {
        WriteUInt16(checked((ushort)value.Length));
        WriteBytes(value);
    }

    public byte[] ToArray() => _buffer.ToArray();
}
