type SendResponse = (responseData?: Record<string, unknown>) => void

export const handleFakeObsHotkeyRequest = (
  hotkeys: ReadonlyArray<string>,
  requestType: string,
  send: SendResponse
): boolean => {
  if (requestType === "GetHotkeyList") {
    send({ hotkeys })
    return true
  }
  if (requestType === "TriggerHotkeyByName" || requestType === "TriggerHotkeyByKeySequence") {
    send()
    return true
  }
  return false
}
