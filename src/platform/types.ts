export type PlatformId = 'standalone' | 'poki'

export interface PokiSdk {
  init(): Promise<void>
  gameLoadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(onAdStart?: () => void): Promise<void>
  rewardedBreak?(onAdStart?: () => void): Promise<boolean>
}

export interface GamePlatform {
  readonly id: PlatformId
  initialize(): Promise<void>
  loadingFinished(): void
  gameplayStart(): void
  gameplayStop(): void
  commercialBreak(): Promise<void>
  rewardedBreak?(): Promise<boolean>
}
