import './Header.css';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Login from '../Auth/Login.js';
import Signup from '../Auth/Signup.js';

const Header=({ onShowForm, showForm, onGoHome, onShowProfile }) => {
    const { currentUser, userProfile, logout } = useAuth();
    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    const handlePostClick = (e) => {
        e.preventDefault();
    // ✅ 如果未登入，提示先登入
        if (!currentUser) {
        alert('⚠️ 請先登入會員才能發布通報');
        setShowLogin(true);
        return;
        }

        if (onShowForm) {
            onShowForm();  
        }
        };
        

        const handleHomeClick = (e) => {
            e.preventDefault();   
            if (onGoHome) {
                onGoHome(); 
            }
        };
        
        const handleProfileClick = (e) => {
            e.preventDefault();
            if (onShowProfile) {
            onShowProfile();
            }
        };

        const handleLogout = async () => {
            if (window.confirm('確定要登出嗎？')) {
            try {
                await logout();
                alert('✅ 已登出');
                onGoHome();
            } catch (error) {
                console.error('登出失敗:', error);
                alert('❌ 登出失敗');
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
                        {currentUser && (
                            <li><a href="#profile" onClick={handleProfileClick}>個人中心</a></li>
                        )}
                        <li><a href="#about">關於我們</a></li>                    
                </div>


        <div className="header-actions">
            
            {currentUser ? (
            <>
                {/* 已登入 */}
                <span className="user-info">
                    👤 {userProfile?.displayName || currentUser.email}
                </span>
                <a href="#post" className="btn-post" onClick={handlePostClick}>
                    {showForm ? '❌ 關閉表單填寫' : '➕ 發佈走失資訊'}
                </a>
                <button className="btn-logout" onClick={handleLogout}>
                    登出
                </button>
            </>
            ) : (
            <>
                {/* 未登入 */}
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


    {showLogin && (
        <Login
            onClose={() => setShowLogin(false)}
            onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
            }}
        />
    )}

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
}

export default Header;