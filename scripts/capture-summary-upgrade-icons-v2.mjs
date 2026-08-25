process.env.SUMMARY_UPGRADE_QA_VERSION = 'v2'
process.env.SUMMARY_UPGRADE_QA_PORT = '4189'
process.env.SUMMARY_UPGRADE_QA_BASELINE = 'docs/qa/screenshots/summary-upgrade-icons-v1/summary-upgrade-icons-1440x810.png'
process.env.SUMMARY_UPGRADE_QA_STROKE_WIDTH = '2.6px'
process.env.SUMMARY_UPGRADE_QA_FORMS = 'pouch,stove,plaque'
process.env.SUMMARY_UPGRADE_QA_MATERIAL_LAYERS = 'true'
process.env.SUMMARY_UPGRADE_QA_MIN_CHANGED_PIXELS = '350'

await import('./capture-summary-upgrade-icons-v1.mjs')
