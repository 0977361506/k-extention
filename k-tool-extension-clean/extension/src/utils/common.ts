import Constants from "./constants";

export function getSubtitleSetting(): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.sync.get([Constants.SETTING_SUBTITLE_KEY], (data) => {
        if (data[Constants.SETTING_SUBTITLE_KEY]) {
          resolve(data[Constants.SETTING_SUBTITLE_KEY]);
        } else {
          resolve(null);
        }
      });
    });
  }
  

  export function getChatSetting(callback: (settings: any) => void) {
    chrome.storage.sync.get([Constants.SETTING_CHAT_KEY], (data) => {
      if (data[Constants.SETTING_CHAT_KEY] && data[Constants.SETTING_CHAT_KEY].sender) {
        callback(data[Constants.SETTING_CHAT_KEY]);
      } else {
        const defaultSettings = {
          sender: new Date().getTime().toString(),
          username: 'Thành viên ẩn danh',
          messageLimit: 1000,
        };
  
        chrome.storage.sync.set({
          [Constants.SETTING_CHAT_KEY]: defaultSettings
        });
  
        callback(defaultSettings);
      }
    });
  }


  export function getWebNameByValue(valueToFind) {
    const foundItem = Constants.LIST_WEB.find(item => item.value === valueToFind);
    return foundItem ? foundItem.label : '';
  }

  export function saveToChromeStorageByKey(key, value) {
    const dataToSave = {};
    dataToSave[key] = value;
  
    chrome.storage.local.set(dataToSave, () => {
      console.log(`Data saved to Chrome Storage with key: ${key}`);
    });
  }
  
  // Lấy dữ liệu từ Chrome Storage theo khóa
  export function getFromChromeStorageByKey(key, callback) {
    chrome.storage.local.get(key, (result) => {
      callback(result[key]);
    });
  }


  export function getFromChromeStorageByKeyWithSaveDefault(key, defaultValue, callback) {
    // Thử lấy giá trị từ Chrome Storage bằng key
    chrome.storage.local.get(key, (result) => {
      const storedValue = result[key];
  
      // Nếu giá trị không tồn tại hoặc là null hoặc undefined, lưu giá trị mặc định vào Chrome Storage
      if (storedValue === null || storedValue === undefined) {
        const data = {};
        data[key] = defaultValue;
        chrome.storage.local.set(data, () => {
          // Sau khi lưu xong, gọi callback với giá trị mặc định
          callback(defaultValue);
        });
      } else {
        // Nếu giá trị đã tồn tại, gọi callback với giá trị từ Chrome Storage
        callback(storedValue);
      }
    });
  }


  export function removeFromChromeStorageByKey(key) {
    chrome.storage.local.remove(key, function() {  
    });
  }
  export function setCookie(name, value, minutes = 60) {
    var expires = "";
  
    if (minutes) {
      var date = new Date();
      date.setTime(date.getTime() + (minutes * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
  
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  }
  


  


  
  
  