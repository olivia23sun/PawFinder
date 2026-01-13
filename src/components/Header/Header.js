import './Header.css';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Login from '../Auth/Login.js';
import Signup from '../Auth/Signup.js';
import toast from 'react-hot-toast';

const Header = ({ onShowForm, showForm, onGoHome, onShowProfile, onShowAbout }) => {
    const { currentUser, userProfile, logout } = useAuth();
    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    // ========== 發布按鈕點擊 ==========
    const handlePostClick = (e) => {
        e.preventDefault();
        
        // 檢查登入狀態
        if (!currentUser) {
            toast.error('⚠️ 請先登入會員才能發布通報');
            setShowLogin(true);
            return;
        }

        if (onShowForm) {
            onShowForm();  
        }
    };

    // ========== 回到首頁 ==========
    const handleHomeClick = (e) => {
        e.preventDefault();   
        if (onGoHome) {
            onGoHome(); 
        }
    };

    // ========== 開啟個人中心 ==========
    const handleProfileClick = (e) => {
        e.preventDefault();
        if (onShowProfile) {
            onShowProfile();
        }
    };

    // ========== 登出處理 ==========
    const handleLogout = async () => {
        if (window.confirm('確定要登出嗎？')) {
            try {
                await logout();
                toast.success('已登出');
                onGoHome();
            } catch (error) {
                console.error('登出失敗:', error);
                toast.error('登出失敗');
            }
        }
    };

    return (
        <>
            <header>
                <nav>
                    <div className="header-logo" onClick={handleHomeClick} style={{ cursor: 'pointer' }}>
                        🐾 PawFinder
                    </div>
                    <div className="menu-link">
                        <li><a href="#home" onClick={handleHomeClick}>首頁</a></li>                    
                    </div>

                    <div className="header-actions">
                        {currentUser ? (
                            <>
                                {/* 已登入狀態 */}
                                <button 
                                    className="user-info-btn" 
                                    onClick={handleProfileClick}
                                    title="查看個人中心"
                                >
                                    {userProfile?.displayName || currentUser.email}
                                </button>
                                <a href="#post" className="btn-post" onClick={handlePostClick}>
                                    {showForm ? '❌ 關閉表單填寫' : '➕ 發佈走失資訊'}
                                </a>
                                <button className="btn-logout" onClick={handleLogout}>
                                    登出
                                </button>
                            </>
                        ) : (
                            <>
                                {/* 未登入狀態 */}
                                <button className="btn-login" onClick={() => setShowLogin(true)}>
                                    登入
                                </button>
                                <button className="btn-signup" onClick={() => setShowSignup(true)}>
                                    註冊
                                </button>
                            </>
                        )}
                    </div>
                </nav>
            </header>

            {/* 登入 Modal */}
            {showLogin && (
                <Login
                    onClose={() => setShowLogin(false)}
                    onSwitchToSignup={() => {
                        setShowLogin(false);
                        setShowSignup(true);
                    }}
                />
            )}

            {/* 註冊 Modal */}
            {showSignup && (
                <Signup
                    onClose={() => setShowSignup(false)}
                    onSwitchToLogin={() => {
                        setShowSignup(false);
                        setShowLogin(true);
                    }}
                />
            )}
        </>
    );
};

export default Header;