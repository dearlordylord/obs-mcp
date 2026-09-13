// Minimal MessagePack codec for the JSON-shaped OBS WebSocket envelopes used by this fixture.
const concat = (parts) => Buffer.concat(parts)
const prefix = (code, bytes = 0) => { const output = Buffer.alloc(1 + bytes); output[0] = code; return output }

export const encodeMsgpack = (value) => {
  if (value === null || value === undefined) return Buffer.from([0xc0])
  if (value === false) return Buffer.from([0xc2])
  if (value === true) return Buffer.from([0xc3])
  if (typeof value === "number") {
    if (Number.isSafeInteger(value)) {
      if (value >= 0 && value <= 0x7f) return Buffer.from([value])
      if (value < 0 && value >= -32) return Buffer.from([0x100 + value])
      if (value >= 0 && value <= 0xff) { const out = prefix(0xcc, 1); out.writeUInt8(value, 1); return out }
      if (value >= 0 && value <= 0xffff) { const out = prefix(0xcd, 2); out.writeUInt16BE(value, 1); return out }
      if (value >= -0x80 && value < 0) { const out = prefix(0xd0, 1); out.writeInt8(value, 1); return out }
      const out = prefix(value >= 0 ? 0xce : 0xd2, 4)
      if (value >= 0) out.writeUInt32BE(value, 1); else out.writeInt32BE(value, 1)
      return out
    }
    const out = prefix(0xcb, 8); out.writeDoubleBE(value, 1); return out
  }
  if (typeof value === "string") {
    const data = Buffer.from(value)
    if (data.length < 32) return concat([Buffer.from([0xa0 | data.length]), data])
    if (data.length <= 0xff) { const head = prefix(0xd9, 1); head.writeUInt8(data.length, 1); return concat([head, data]) }
    const head = prefix(0xda, 2); head.writeUInt16BE(data.length, 1); return concat([head, data])
  }
  if (Array.isArray(value)) {
    const values = value.map(encodeMsgpack)
    if (values.length < 16) return concat([Buffer.from([0x90 | values.length]), ...values])
    const head = prefix(0xdc, 2); head.writeUInt16BE(values.length, 1); return concat([head, ...values])
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const data = Buffer.from(value)
    const head = data.length <= 0xff ? prefix(0xc4, 1) : prefix(0xc5, 2)
    if (data.length <= 0xff) head.writeUInt8(data.length, 1); else head.writeUInt16BE(data.length, 1)
    return concat([head, data])
  }
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, entry]) => entry !== undefined)
    const parts = entries.flatMap(([key, entry]) => [encodeMsgpack(key), encodeMsgpack(entry)])
    if (entries.length < 16) return concat([Buffer.from([0x80 | entries.length]), ...parts])
    const head = prefix(0xde, 2); head.writeUInt16BE(entries.length, 1); return concat([head, ...parts])
  }
  throw new Error(`unsupported MessagePack value type ${typeof value}`)
}

export const decodeMsgpack = (input) => {
  const buffer = Buffer.from(input)
  let offset = 0
  const bytes = (length) => { const start = offset; offset += length; if (offset > buffer.length) throw new Error("truncated MessagePack"); return buffer.subarray(start, offset) }
  const uint = (length) => { const data = bytes(length); return length === 1 ? data.readUInt8() : length === 2 ? data.readUInt16BE() : data.readUInt32BE() }
  const parse = () => {
    const code = uint(1)
    if (code <= 0x7f) return code
    if (code >= 0xe0) return code - 0x100
    if ((code & 0xe0) === 0xa0) return bytes(code & 0x1f).toString()
    if ((code & 0xf0) === 0x90) return Array.from({ length: code & 0x0f }, parse)
    if ((code & 0xf0) === 0x80) return Object.fromEntries(Array.from({ length: code & 0x0f }, () => [parse(), parse()]))
    switch (code) {
      case 0xc0: return null
      case 0xc2: return false
      case 0xc3: return true
      case 0xc4: return bytes(uint(1))
      case 0xc5: return bytes(uint(2))
      case 0xca: { const data = bytes(4); return data.readFloatBE() }
      case 0xcb: { const data = bytes(8); return data.readDoubleBE() }
      case 0xcc: return uint(1)
      case 0xcd: return uint(2)
      case 0xce: return uint(4)
      case 0xd0: { const data = bytes(1); return data.readInt8() }
      case 0xd1: { const data = bytes(2); return data.readInt16BE() }
      case 0xd2: { const data = bytes(4); return data.readInt32BE() }
      case 0xd9: return bytes(uint(1)).toString()
      case 0xda: return bytes(uint(2)).toString()
      case 0xdb: return bytes(uint(4)).toString()
      case 0xdc: return Array.from({ length: uint(2) }, parse)
      case 0xdd: return Array.from({ length: uint(4) }, parse)
      case 0xde: return Object.fromEntries(Array.from({ length: uint(2) }, () => [parse(), parse()]))
      case 0xdf: return Object.fromEntries(Array.from({ length: uint(4) }, () => [parse(), parse()]))
      default: throw new Error(`unsupported MessagePack code 0x${code.toString(16)}`)
    }
  }
  const value = parse()
  if (offset !== buffer.length) throw new Error("trailing MessagePack bytes")
  return value
}

