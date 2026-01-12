import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Signup = ({ onSwitchToLogin, onClose }) => {
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { signup } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.displayName || !formData.email || !formData.password || !formData.phone) {
            setError('❌ 請填寫所有欄位');
            return false;
        }

        if (formData.password.length < 6) {
            setError('❌ 密碼至少需要 6 個字元');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('❌ 兩次密碼輸入不一致');
            return false;
        }

        const phoneRegex = /^09\d{8}$/;
        if (!phoneRegex.test(formData.phone.replace(/[- ]/g, ''))) {
            setError('❌ 請輸入有效的手機號碼（例：0912345678）');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            await signup(
                formData.email, 
                formData.password, 
                formData.displayName,
                formData.phone
            );
            
            toast.success('註冊成功！歡迎加入 PawFinder');
                if (onClose) {
                console.log('✅ 執行 onClose');
                onClose();
                } else {
                console.error('❌ onClose 未定義！');
                }

        } catch (err) {
            console.error('註冊失敗:', err);
            
            switch (err.code) {
                case 'auth/email-already-in-use':
                    setError('❌ 此電子郵件已被註冊');
                    break;
                case 'auth/invalid-email':
                    setError('❌ 電子郵件格式不正確');
                    break;
                case 'auth/weak-password':
                    setError('❌ 密碼強度太弱');
                    break;
                default:
                    setError('❌ 註冊失敗：' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={onClose}>✕</button>
                
                <h2 className="auth-title">🐾 會員註冊</h2>
                
                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-form-group">
                        <label>姓名 *</label>
                        <input
                            type="text"
                            name="displayName"
                            value={formData.displayName}
                            onChange={handleChange}
                            placeholder="您的名字"
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-form-group">
                        <label>電子郵件 *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-form-group">
                        <label>手機號碼 *</label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="0912345678"
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-form-group">
                        <label>密碼 * (至少 6 個字元)</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="請輸入密碼"
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-form-group">
                        <label>確認密碼 *</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="再次輸入密碼"
                            className="auth-input"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="auth-submit-btn"
                    >
                        {loading ? '註冊中...' : '註冊'}
                    </button>
                </form>

                <p className="auth-switch">
                    已經有帳號？
                    <button 
                        onClick={onSwitchToLogin}
                        className="auth-switch-btn"
                    >
                        立即登入
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Signup;
