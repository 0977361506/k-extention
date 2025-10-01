const isLocal= true;
const rootUrl = isLocal ? 'http://localhost:5001' : 'https://gendoc.thangnotes.dev';
export const  extensionSettings = 'extensionSettings';
export const  GEN_DOC_URL = `${rootUrl}/api/generate-full-confluence-doc`;
export const  GEN_DOC_STATUS_URL = `${rootUrl}/api/generate-status`;
export const  GEN_DOC_RESULT_URL = `${rootUrl}/api/generate-result`;
export const  EDIT_DIAGRAM_URL = `${rootUrl}/api/edit-diagram`;
export const  EDIT_TEXT_URL = `${rootUrl}/api/edit-text`;