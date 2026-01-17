/**
 * 將 Firebase 的錯誤代碼轉換為易懂的中文訊息
 * @param {string} code - Firebase 錯誤代碼 (err.code)
 * @returns {string} 友善的中文提示
 */

export const translateFirebaseError = (code) => {
    switch (code) {
        // 身份驗證相關 (Auth)
        case 'auth/invalid-email':
            return '電子郵件格式不正確';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential': 
            return '電子郵件或密碼錯誤，若尚未註冊請先建立帳號';
        case 'auth/email-already-in-use':
            return '此電子信箱已被其他帳號使用';
        case 'auth/weak-password':
            return '密碼強度不足，請輸入至少 6 位字元';
        case 'auth/too-many-requests':
            return '嘗試次數過多，請稍後再試';

        // === 儲存空間錯誤 ===
        case 'storage/unauthorized':
            return '沒有權限上傳檔案';
        case 'storage/canceled':
            return '上傳已取消';
        case 'storage/unknown':
            return '上傳失敗,請檢查網路連線';
        case 'storage/object-not-found':
            return '找不到檔案';
        case 'storage/quota-exceeded':
            return '儲存空間已滿';
        case 'storage/invalid-format':
            return '不支援的檔案格式';

        // 資料庫權限相關 (Firestore)
        case 'permission-denied':
            return '您沒有權限執行此操作';
        case 'unavailable':
            return '伺服器目前無法連線，請檢查網路';
        case 'not-found': 
            return '找不到該筆資料';
        case 'resource-exhausted': 
            return '系統流量過高，請稍後再試';
            
        // === 網路錯誤 ===
        case 'network-request-failed':
        return '網路連線失敗,請檢查網路狀態';

        default:
            console.error('未處理的錯誤碼:', code);
            return '系統發生錯誤，請稍後再試';
    }
};
