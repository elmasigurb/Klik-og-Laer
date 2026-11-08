import { EXERCISE_RESULT_ADAPTERS as RESULT_MANIFEST, EXERCISE_RESULT_MANIFEST_VERSION, getManifestAdapter } from '../../../appwrite/functions/student-progress/src/exerciseResultManifest.mjs'

const FRONTEND_ADAPTER_DETAILS = [
  ['212bb7db-22ff-4c40-8b72-4e4663a4c266', 'Orðflokkagreining', 'dbacf049b49f6770fc75d9fa4a84cceff773e9128d065f9d29673a84ae3d7b81', 'bulk-submit', '#result', '#summary', 40, '#retry'],
  ['a741b705-1ad5-4a86-9501-6795e812a662', 'Blandað verkefni úr sögnum', '2865c292a3c103a83dcea8ea90f125c8cfd0ab7b5931ea84f668b99d0818a488', 'bulk-submit', '#results', '#score', 30, '#retryBtn'],
  ['0fb24e4b-cf23-474b-97ca-765c5041186a', 'Lýsingarháttur þátíðar', '31e5a4f08ea543c582849ca245e377188931218bf98bdca677f08968ee750ccc', 'bulk-submit', '#results', '#score', 30, '#retryBtn'],
  ['96698fed-e265-4f2a-9c8a-ae613415bc6f', 'Núþálegar sagnir', '1d0ca88096e280e7a171ac9f31faab29515ca6126bb9581bbf002c8fa2f60f8a', 'sequential-completion', '#result', '#resultScore', 30, '#retry'],
  ['c2a59d93-50b5-4ad4-9b9e-42032ba4a20c', 'Óreglulegar beygingar sagnorða', '835c32a49de6a3d883239e27d91d04c2e4f10806db5c95241f7f992d3c0d1073', 'bulk-submit', '#result', '#score', 30, '#retry'],
  ['9ec826af-db83-4832-9e00-33e7a899a986', 'Regluleg beyging sagnorð', '81e5d41aef63178d68148ade3113943e5abbc97ebda4a464665c4aa97fa31d47', 'bulk-submit', '#results', '#summary', 30, '#retry'],
  ['fd291210-6f5e-48f3-8776-7093e0c12e64', 'Boðháttur sagna', '33227938ba1e6ed520e5cdf8d75fa5e470ce50168bfcee26cf1eeb83d0c6aeb6', 'bulk-submit', '#results', '#score', 30, '#retry'],
  ['04d8af11-60c2-4c7b-968a-09e15722541c', 'Sagnorð- nútíð/þátíð/nafnháttur', '274580032e75f9cf01a74b645ede4d63891814c29464afb55cda9d14db39440d', 'sequential-completion', '#result', '#resultText', 30, '#retry'],
  ['309a1e2d-e3ce-4bd3-a79e-16715a801560', 'Forsetningar- erfiðari æfing', '9dc1cf7fbeb51b9b4641351443912bb2b4372369b73e9c0b7035841d3e54ef8b', 'sequential-completion', '#results', '#resultInfo', 25, '#retry'],
  ['68007127-09d7-4fa1-9d33-e9b632ae8cc6', 'Forsetningar', 'f008cac87289089ad6a3f3982d6a0741d474adc35aa076f22c798b5460afdff4', 'sequential-completion', '#results', '#summary', 25, '#retry'],
  ['21d6371b-f9ed-466b-8a81-e0cd6c55ebef', 'Tímaorð og tímasetningar', '7767f0a1b36410a4886e10a98f61206e0dec9c0f2aae2ae35c12dfe4f0fb8ed7', 'sequential-completion', '#results', '#resultText', 25, '#retry'],
  ['1ec743ea-5cea-453c-b403-22b50595677f', 'Töluorð', '141a5d393e42031fa59f8102dc61e525566e979cc8f81a58e341904cd4e58577', 'sequential-completion', '#result', '#score', 25, '#retry'],
  ['6113f9fa-cc51-4f30-89eb-1e76c08fed08', 'Lýsingarorð-blönduð æfing', 'a367e5f540d0430bac75e2165718867f2be0ed485c404010fd8d5281eda2ec42', 'multi-stage-point-based', '#results', '#resultSummary', 35, '#retry'],
  ['8883e8a6-1f84-4588-9bfe-3d4e00f74438', 'Nafnorð-blönduð æfing', 'c3e230c9dd44b125106bb648e3bc12e5da167d80a1f8516ea9750eaf10123057', 'multi-stage-point-based', '#finish', '#summary', 35, '[onclick="start()"]'],
  ['f99de096-f827-49e4-98f4-44387d4fef87', 'Blandað verkefni-öll fornöfn', 'df606c66e27959edfce44bedc855e65c588ba54add8b74588e0b40c3ed5e92aa', 'multi-stage-point-based', '#result', '#scoreLine', 35, '#retry'],
  ['1012c100-0a67-45b6-9669-02c46bf375f8', 'Óákveðin fornöfn', 'c000c9d964a7a65ca615238d9d79fba901feb1c732e70186b2d4a418633ccf4a', 'sequential-completion', '#result', '#resultText', 25, '[onclick="retry()"]'],
  ['1d437a28-062e-45c3-8b39-c691dd5e4062', 'Spurnarfornöfn', 'b5de20b892f76e3e6d8edced372f49980beafb940fe254470c1d8a243753aee5', 'sequential-completion', '#results', '#score', 25, '[onclick="restart()"]'],
  ['4438087d-f48d-4c02-b33b-3e52ba7b3d2a', 'Afturbeygð fornöfn', '77f38ce912a03bbefab19c908d54d3176d4fe264cf0e1c717504e9fdf23f1315', 'sequential-completion', '#result', '#scoreText', 25, '#retry'],
  ['2e7fe73a-139c-4c54-87cb-d799d3ce45f6', 'Eignarfornöfn', 'b3fda4c5bcb5f5ce73d64eaaecc09d7e4e044aa1aec5211a6f3592a248de4b66', 'sequential-completion', '#results', '#resultText', 25, '#retry'],
  ['be6df255-a1de-45b7-9c2f-8f9cb99d0861', 'Ábendingarfornöfn', 'ac1887fdb2c0b6cb1bdf8e065d6a6f5d7c2c69e98e78ceb56a31d770e39d41dd', 'sequential-completion', '#result', '#resultText', 25, '#retry'],
  ['d03d085c-502d-4357-8b92-8d933d73686c', 'Persónufornöfn/personlige pronominer', '41c0698c1ab23245afaeb10783dfe4fec905d3bf047a21b973d18da680785201', 'sequential-completion', '#finish', '#result', 25, '#retry'],
  ['38a7c3c9-09e4-480b-84e5-7c0edda8021a', 'Ákveðinn háttur lýsingarorða', '53e364556b747b2f1f837304e720eeacb07d5ece6c36617ae3f5d010487c6992', 'sequential-completion', '#results', '#resultText', 25, '#retry'],
  ['94539936-0840-4eb6-ac46-57cf0841e462', 'Eintala og fleirtala lýsingarorða', 'df2c426d9dcb2a8a82d88710aa7c2fc7769d5919922adc267937a85e566fd7ed', 'sequential-completion', '#result', '#resultBody', 25, '#retry'],
  ['282dd7b1-066c-46ec-a886-5dfb2bc1f915', 'Stigbreyting lýsingarorða', '112104f5ce726aadb1038d2f614b222d47e4265822d566216f4f8e494c571672', 'sequential-completion', '#results', '#resultText', 25, '#retry'],
  ['c3bf6fbc-c2c1-4d0d-b75e-a11c3909cec2', 'Endingar lýsingarorða', '89b25df579ddf8b960f89409dc0aed91498dac62894afadc4a4ffb75172fc2f0', 'sequential-completion', '#result', '#score', 25, '[onclick="restart()"]'],
  ['10a3b99e-aca1-4444-acb6-061b061250e6', 'Eignarfall nafnorða', 'bee5363fe27a737733963b207d1040b2c51648f41207efe773366fff50dc3965', 'bulk-submit', '#resultPanel', '#resultText', 25, '#retryBtn'],
  ['52c099e1-e562-412a-9757-39dbff3f6cf5', 'Eintala/fleirtala nafnorða', 'c1ff27e506e40d3c17cc6ae7caae22b450154facb919694d022b29b9a9eaf848', 'bulk-submit', '#result', '#score', 25, '#retry'],
  ['5a65684b-c4ad-42f2-8f9d-cdd4b0fc567e', 'Ákveðinn og óákveðinn greinir nafnorða', '26a676e5bcb2a340d0e83352cd5128269f527226fb5640dadc05417e571a6019', 'multi-stage-point-based', '#result', '#result', 30, '#retry'],
  ['792b8e43-6f77-4a8b-9de0-ef8e3e52a4a9', 'Nafnorð en/et', 'db287c10aa96d272729f56dc7d317addea4b48ff920a105e169194179811e821', 'multi-stage-point-based', '#finalscore', '#finalscore', 30, '#retry'],
  ['7e18c543-3200-4c2a-95c9-b280d3649888', 'Boðháttur- fyrir lengra komna', '48b9c0e4abd07fdb603ca2b8a120703d7cceb524c1e6ce4c3e9dc2a063dea44e', 'bulk-submit', '#result', '#result', 24, '#retry'],
  ['3a1ba87f-b90e-4745-8f97-4fe8de4d120d', 'Finnið boðháttinn í setningunum', '13fb7c011d60f6e48a92625934b85af41c9cc121c559c876a26c2d44e5c11556', 'sequential-completion', '#results', '#summary', 25, '#restart'],
  ['2893d5d4-4848-4221-9bc1-bae6a303c19c', 'Náðu tökum á reglunum', '7619cb68ac6788c654422c728938b7b0e727db0c3d1ca8d8d619db334b268d3b', 'sequential-completion', '#results', '#score', 25, '#retry'],
  ['54eb3e8b-29fd-4105-bc88-3dd89bf2e12a', 'Orðaævintýri', '66f3bb91f578c66a8cc8ef52ea9fb2093ece8ce7e43e622d56f6c6a778dbe99c', 'multi-stage-point-based', '#result', '#resultText', 250, '#retry'],
  ['d7bedc43-29d1-4769-98fd-2ab3991a0755', 'Ritun- hverdagen', '7abe9efef1746bd436347e698e0d21a9bc7d28fa17bf51b2a35c770313885068', 'composite-writing', '#result', '#result', 10, '[onclick="resetAll()"]', '.feedback.good'],
  ['8c4c588b-b559-4406-83ac-8ff6ea552eb7', 'Ritunaræfing', '7abe9efef1746bd436347e698e0d21a9bc7d28fa17bf51b2a35c770313885068', 'composite-writing', '#result', '#result', 10, '[onclick="resetAll()"]', '.feedback.good'],
  ['3e43c0ac-61db-4853-b741-df8f3eab4aad', 'Ákveðin/óákveðin nafnorð í eintölu og fleirtölu', '505485ef7a0f843c72e6443bf7bcee9e0ee650aee2487aa0a948028cfc7804f0', 'bulk-submit', '#result', '#result', 30, '#retry'],
].map(([exerciseId, title, htmlSignature, family, finalSelector, scoreSelector, possible, retrySelector, additionalCompletionSelector]) => ({
  id: `${family}-${exerciseId.slice(0, 8)}-v1`, exerciseId, title, htmlSignature, family, finalSelector, scoreSelector,
  scorePattern: `(\\d+)\\s*(?:\\/|af)\\s*${possible}(?=\\s|\\)|$)`, possible, retrySelector, additionalCompletionSelector,
  requiresAdditionalCompletion: Boolean(additionalCompletionSelector),
}))

export { EXERCISE_RESULT_MANIFEST_VERSION }

export const EXERCISE_RESULT_ADAPTERS = FRONTEND_ADAPTER_DETAILS.map((details) => {
  const manifest = getManifestAdapter(details.exerciseId)
  if (!manifest || manifest.id !== details.id || manifest.htmlSignature !== details.htmlSignature || manifest.family !== details.family || manifest.possible !== details.possible || manifest.requiresAdditionalCompletion !== details.requiresAdditionalCompletion) {
    throw new Error(`Exercise result adapter diverges from manifest: ${details.exerciseId}`)
  }
  return { ...details, ...manifest }
})

if (EXERCISE_RESULT_ADAPTERS.length !== RESULT_MANIFEST.length) throw new Error('Exercise result adapter manifest count mismatch.')
