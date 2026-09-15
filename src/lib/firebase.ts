import { getApp, getApps, initializeApp } from 'firebase/app'
import {
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  browserSessionPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth'
import { getFirebaseWebConfig } from '../config'

const appName = 'kbm-token-helper'
let authInstance: Auth | undefined

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance
  const app = getApps().some((candidate) => candidate.name === appName)
    ? getApp(appName)
    : initializeApp(getFirebaseWebConfig(), appName)
  authInstance = initializeAuth(app, {
    persistence: browserSessionPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  })
  return authInstance
}

export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return provider
}
