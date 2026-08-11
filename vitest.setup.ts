import React from 'react'

// The legacy interaction fixtures were authored when JSX used the classic
// runtime. Keep a global for those fixtures while production remains on the
// automatic React JSX runtime.
Object.assign(globalThis, { React })
;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
