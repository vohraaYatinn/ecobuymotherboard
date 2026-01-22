import { Preferences } from "@capacitor/preferences"

const TOKEN_KEY = "vendorToken"
const DATA_KEY = "vendorData"

const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.error(`Failed to set localStorage for ${key}:`, error)
  }
}

const safeRemoveLocalStorage = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.error(`Failed to remove localStorage for ${key}:`, error)
  }
}

export const getVendorToken = async (): Promise<string | null> => {
  try {
    const { value } = await Preferences.get({ key: TOKEN_KEY })
    if (value) {
      safeSetLocalStorage(TOKEN_KEY, value)
      return value
    }
  } catch (error) {
    console.error("Failed to read vendor token from Preferences:", error)
  }

  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (error) {
    console.error("Failed to read vendor token from localStorage:", error)
    return null
  }
}

export const setVendorAuth = async (token: string, data: unknown) => {
  const serialized = JSON.stringify(data)
  try {
    await Preferences.set({ key: TOKEN_KEY, value: token })
    await Preferences.set({ key: DATA_KEY, value: serialized })
  } catch (error) {
    console.error("Failed to save vendor auth to Preferences:", error)
  }

  safeSetLocalStorage(TOKEN_KEY, token)
  safeSetLocalStorage(DATA_KEY, serialized)
}

export const clearVendorAuth = async () => {
  try {
    await Preferences.remove({ key: TOKEN_KEY })
    await Preferences.remove({ key: DATA_KEY })
  } catch (error) {
    console.error("Failed to remove vendor auth from Preferences:", error)
  }

  safeRemoveLocalStorage(TOKEN_KEY)
  safeRemoveLocalStorage(DATA_KEY)
}
