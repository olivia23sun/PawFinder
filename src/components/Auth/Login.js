import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const Login = ({ onSwitchToSignup, onClose }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth(); 

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password) {
            setError('❌ 請填寫所有欄位');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await login(formData.email, formData.password);
            toast.success('登入成功！');
            onClose(); 
        } catch (err) {
            console.error('登入失敗:', err);
                switch (err.code) {
                case 'auth/invalid-email':
                    setError('❌ 電子郵件格式不正確');
                    break;
                case 'auth/user-not-found':
                    setError('❌ 找不到此帳號，請先註冊');
                    break;
                case 'auth/wrong-password':
                    setError('❌ 密碼錯誤');
                    break;
                case 'auth/invalid-credential':
                    setError('❌ 帳號或密碼錯誤');
                    break;
                default:
                    setError('❌ 登入失敗：' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-modal-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-modal-close" onClick={onClose}>✕</button>
                
                <h2 className="auth-title">會員登入</h2>
                
                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-form-group">
                        <label>電子郵件</label>
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
                        <label>密碼</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="請輸入密碼"
                            className="auth-input"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="auth-submit-btn"
                    >
                        {loading ? '登入中...' : '登入'}
                    </button>
                </form>

                <p className="auth-switch">
                    還沒有帳號？
                    <button 
                        onClick={onSwitchToSignup}
                        className="auth-switch-btn"
                    >
                        立即註冊
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
