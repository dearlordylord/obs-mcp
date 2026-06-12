declare const PKG_VERSION: string | undefined

export const packageVersion = typeof PKG_VERSION === "string" ? PKG_VERSION : "0.1.0"
