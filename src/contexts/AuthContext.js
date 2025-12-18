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

// AuthContext 是一個「全域狀態管理器」，用來：
// 1管理使用者的登入狀態
// 2提供登入/註冊/登出的功能給所有組件使用
// 3自動監聽使用者狀態變化


// 建立一個「資料倉庫」，讓所有組件都能存取使用者資訊
// 類似一個「全域變數」，但更強大
const AuthContext = createContext();

// 自訂 Hook：方便其他組件使用
//讓其他組件可以輕鬆取得使用者資訊
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth 必須在 AuthProvider 內使用');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // 註冊
    const signup = async (email, password, displayName, phone) => {
        try {
            // 1. 建立 Firebase Auth 帳號
            const userCredential = await createUserWithEmailAndPassword(auth, email, password); //固定寫法
            const user = userCredential.user; 

            // 2. 更新顯示名稱
            await updateProfile(user, { displayName }); 
            //等於 await updateProfile(user, { displayName: displayName });
            //因為變數名稱相同，可以簡寫成 { displayName }

            //updateProfile用途：更新身份驗證相關的基本資料
            //可更新欄位：只有 displayName 和 photoURL
            //時機：註冊時設定名稱、更換大頭照

            // 3. 在 Firestore 建立使用者資料
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: email,
                displayName: displayName,
                phone: phone,
                createdAt: new Date(),
                role: 'user'
            });
            // setDoc用途：儲存完整的使用者資料
            // 可儲存欄位：任何自訂欄位（phone, address, role...）
            // 時機：需要儲存 Auth 沒有的額外資料(也可以存auth裡有的，通常會重複存，因為希望在 Firestore 文件裡有完整資料，不用切換資料來源)

            return user;
        } catch (error) {
            console.error('註冊失敗:', error);
            throw error;
        }
    };

    // 登入
    const login = async (email, password) => {
        return await signInWithEmailAndPassword(auth, email, password);
        // 使用 Firebase 的 signInWithEmailAndPassword 驗證
        // 驗證成功後，Firebase 會自動觸發 onAuthStateChanged
    };

    // 登出
    const logout = async () => {
        return await signOut(auth);
    };

    // 取得使用者詳細資料
    const fetchUserProfile = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setUserProfile(docSnap.data());
            } else {
            console.warn('使用者資料不存在');
        }
        } catch (error) {
            console.error('取得使用者資料失敗:', error);
        }
    };

    // 監聽使用者登入狀態
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            // 不管 user 是什麼都存入
            // 登入時：存使用者物件
            // 登出時：存 null
            
            if (user) {
                await fetchUserProfile(user.uid);
            } else {
                setUserProfile(null);
            }
            
            setLoading(false);
        });

        return unsubscribe;

        //  useEffect：回傳清理函式

             //return () => {  // ← 不是立即執行
                //console.log(data);
                //};
                //     ↑
                //     React 把這個函式「存起來」
                //     等組件卸載時才執行
    }, []);

    const value = {
        currentUser,
        userProfile,
        signup,
        login,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {/* value 物件會傳遞給所有使用 useAuth() 的組件 */}
            {!loading && children}  
            {/* 等載入完成才顯示內容 */}
        </AuthContext.Provider>
    );
};
