import { createContext, useContext, useState, useEffect } from 'react';
import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { translateFirebaseError } from '../utils/errorHelpers';

// ========== 建立 Context ==========
// 用於在整個應用程式中共享使用者狀態
const AuthContext = createContext();

// ========== 自訂 Hook：方便其他元件使用 ==========
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必須在 AuthProvider 內使用');
    }
    return context;
};

// ========== Auth Provider：狀態管理中心 ==========
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);        // Firebase Auth 使用者
    const [userProfile, setUserProfile] = useState(null);        // Firestore 使用者資料
    const [loading, setLoading] = useState(true);                // 初始載入狀態

    // ========== 註冊功能 ==========
    const signup = async (email, password, displayName, phone) => {
        try {
            // 1. 建立 Firebase Auth 帳號
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. 更新 Auth 的顯示名稱
            await updateProfile(user, { displayName });

            // 3. 在 Firestore 建立使用者文件（儲存完整資料）
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email,
                displayName: displayName,
                phone: phone,
                createdAt: new Date(),
                role: 'user'
            });

            return user;
        } catch (error) {
            console.error('註冊失敗:', error);
            throw new Error(translateFirebaseError(error.code));
        }
    };

    // ========== 登入功能 ==========
    const login = async (email, password) => {
        // Firebase 會自動觸發 onAuthStateChanged
        try {
            return await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            throw new Error(translateFirebaseError(error.code));
        }
    };

    // ========== 登出功能 ==========
    const logout = async () => {
        return await signOut(auth);
    };

    // ========== 從 Firestore 取得使用者詳細資料 ==========
    const fetchUserProfile = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
            }
        } catch (error) {
            console.error('取得使用者資料失敗:', error);
        }
    };

    // ========== 監聽登入狀態變化 ==========
    // 當使用者登入/登出時自動觸發
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);  // 更新 Auth 使用者
            
            if (user) {
                // 登入時：載入 Firestore 資料
                await fetchUserProfile(user.uid);
            } else {
                // 登出時：清空資料
                setUserProfile(null);
            }
            
            setLoading(false);  // 完成初始載入
        });

        // 清理函式：元件卸載時取消監聽
        return unsubscribe;
    }, []);

    // ========== 提供給子元件的值 ==========
    const value = {
        currentUser,    // Firebase Auth 使用者物件
        userProfile,    // Firestore 使用者資料
        signup,         // 註冊函式
        login,          // 登入函式
        logout,         // 登出函式
        loading         // 載入狀態
    };

    return (
        <AuthContext.Provider value={value}>
            {/* 等載入完成才顯示子元件 */}
            {!loading && children}
        </AuthContext.Provider>
    );
};