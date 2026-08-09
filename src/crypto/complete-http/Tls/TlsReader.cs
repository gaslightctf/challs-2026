using System.Buffers.Binary;

namespace CompleteHttp.Tls;

/// <summary>
/// Cursor over a handshake message body. Every read is bounds-checked and a
/// short buffer raises decode_error, so callers can parse straight through
/// without repeating length checks.
/// </summary>
internal ref struct TlsReader(ReadOnlySpan<byte> source)
{
    private readonly ReadOnlySpan<byte> _source = source;
    private int _offset = 0;

    public readonly bool IsEmpty => _offset == _source.Length;

    public ReadOnlySpan<byte> ReadBytes(int count)
    {
        if (count < 0 || _source.Length - _offset < count)
            throw new TlsAlertException(AlertDescription.DecodeError, "message truncated");

        ReadOnlySpan<byte> slice = _source.Slice(_offset, count);
        _offset += count;
        return slice;
    }

    public byte ReadUInt8() => ReadBytes(1)[0];

    public ushort ReadUInt16() => BinaryPrimitives.ReadUInt16BigEndian(ReadBytes(2));

    /// <summary>Reads a vector with a one-byte length prefix.</summary>
    public ReadOnlySpan<byte> ReadVector8() => ReadBytes(ReadUInt8());

    /// <summary>Reads a vector with a two-byte length prefix.</summary>
    public ReadOnlySpan<byte> ReadVector16() => ReadBytes(ReadUInt16());

    /// <summary>Fails unless the whole buffer has been consumed.</summary>
    public readonly void ExpectEnd(string what)
    {
        if (!IsEmpty)
            throw new TlsAlertException(AlertDescription.DecodeError, $"trailing bytes after {what}");
    }
}
