import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import DOG_STATUS from '../../constants/status';
import { translateFirebaseError } from '../../utils/errorHelpers';
import './Profile.css';

const Profile = ({ onEditDog, onUpdate }) => {
    const { currentUser, userProfile } = useAuth();
    const [myDogs, setMyDogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    

    useEffect(() => {
        if (currentUser) {
            fetchMyDogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // 從 Firestore 查詢當前使用者的通報
    const fetchMyDogs = async () => {
        try {
            setLoading(true);
            setError('');
            
            const q = query(
                collection(db, 'lostDogs'),
                where('userId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const dogsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setMyDogs(dogsData);
            console.log('✅ 成功載入我的通報:', dogsData.length, '筆');
        } catch (error) {
            console.error('❌ 載入失敗:', error);
            setError('⚠️ 載入失敗，請重新整理頁面');
        } finally {
            setLoading(false);
        }
    };

    // 切換狀態：「已找到」⇄「尋找中」
    const handleToggleStatus = async (dogId, currentStatus) => {
        const newStatus = currentStatus === DOG_STATUS.FOUND ? DOG_STATUS.LOST : DOG_STATUS.FOUND;
        const confirmMsg = newStatus === DOG_STATUS.FOUND
            ? '確定要標記為「已找到」嗎？' 
            : '確定要改回「尋找中」嗎？';
        
        if (window.confirm(confirmMsg)) {
            try {
                await updateDoc(doc(db, 'lostDogs', dogId), {
                    status: newStatus
                });
                
                // 更新本地狀態，避免重新查詢資料庫
                setMyDogs(prev => prev.map(dog => 
                    dog.id === dogId ? { ...dog, status: newStatus } : dog
                ));

                
                if (onUpdate) {
                    onUpdate();
                }

                toast.success(newStatus === DOG_STATUS.FOUND ? '已標記為「已找到」' : '已改回「尋找中」');
            } catch (error) {
                const friendlyMessage = translateFirebaseError(error.code);
                toast.error(`${friendlyMessage}`);
                console.error('❌ 更新失敗:', error);
            }
        }
    };

    const handleEdit = (dog) => {
        if (onEditDog) {
            onEditDog(dog);  // 調用父組件傳入的函數
        }
    };

    const handleDelete = async (dogId) => {
        if (window.confirm('確定要刪除這筆通報嗎？此操作無法復原！')) {
            try {
                await deleteDoc(doc(db, 'lostDogs', dogId));
                // 更新本地狀態，避免重新查詢
                setMyDogs(prev => prev.filter(dog => dog.id !== dogId));

                if (onUpdate) {
                    onUpdate();
                }
                toast.success('✅ 刪除成功！');
            } catch (error) {
                const friendlyMessage = translateFirebaseError(error.code);
                toast.error(`❌ ${friendlyMessage}`);
            }
        }
    };

    // 統計資訊
    const stats = {
        total: myDogs.length,
        lost: myDogs.filter(dog => dog.status === DOG_STATUS.LOST).length,
        found: myDogs.filter(dog => dog.status === DOG_STATUS.FOUND).length
    };

    // 前端篩選（Firestore 對多條件查詢有限制）
    const filteredDogs = myDogs.filter(dog => {
        if (filter === 'all') return true;
        return dog.status === filter;
    });

    const getDaysLost = (createdAt) => {
        if (!createdAt) return null;
        const now = new Date();
        const lostDate = createdAt.toDate();
        const days = Math.floor((now - lostDate) / (1000 * 60 * 60 * 24));
        return days;
    };

    // ========== Early Return Pattern：避免巢狀條件 ==========
    // 按優先級處理 UI 狀態，確保每個狀態互斥
    
    // 1. 未登入
    if (!currentUser) {
        return (
            <div className="profile-container">
                <div className="profile-error">
                    <h2>⚠️ 請先登入</h2>
                    <p>您需要登入才能查看個人中心</p>
                </div>
            </div>
        );
    }

    // 2. 載入中
    if (loading) {
        return (
            <div className="profile-container">
                <p style={{ textAlign: 'center', padding: '2.5rem' }}>載入中...</p>
            </div>
        );
    }

    // 3. 錯誤狀態（直接 return，避免同時顯示錯誤和空資料提示）
    if (error) {
        return (
            <div className="profile-container">
                <div style={{
                    padding: '1.25rem',
                    background: '#fee',
                    color: '#c33',
                    borderRadius: '0.5rem',
                    margin: '1.25rem 0',
                    textAlign: 'center',
                    border: '1px solid #fcc'
                }}>
                    <p style={{ margin: '0 0 0.625rem 0' }}>{error}</p>
                    <button 
                        onClick={fetchMyDogs}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#c33',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                        }}
                    >
                        重試
                    </button>
                </div>
            </div>
        );
    }

    // 4. 正常狀態：渲染完整介面
    return (
        <div className="profile-container">
            {/* 個人資訊卡片 */}
            <div className="profile-header">
                <div className="profile-avatar">
                    {userProfile?.displayName?.[0]?.toUpperCase() || '👤'}
                </div>
                <div className="profile-info">
                    <h2>{userProfile?.displayName || '使用者'}</h2>
                    <p>{userProfile?.email || currentUser.email}</p>
                    <p>📞 {userProfile?.phone || '未設定'}</p>
                </div>
            </div>

            {/* 統計資訊 */}
            <div className="profile-stats">
                <div className="stat-card">
                    <div className="stat-number">{stats.total}</div>
                    <div className="stat-label">總通報數</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number" style={{ color: 'rgb(241, 23, 52)' }}>{stats.lost}</div>
                    <div className="stat-label">尋找中</div>
                </div>
                <div className="stat-card">
                    <div className="stat-number" style={{ color: '#10b981' }}>{stats.found}</div>
                    <div className="stat-label">已找到</div>
                </div>
            </div>

            {/* 篩選按鈕 */}
            <div className="profile-filters">
                <button 
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                >
                    全部 ({stats.total})
                </button>
                <button 
                    className={`filter-btn ${filter === DOG_STATUS.LOST ? 'active' : ''}`}
                    onClick={() => setFilter(DOG_STATUS.LOST)}
                >
                    尋找中 ({stats.lost})
                </button>
                <button 
                    className={`filter-btn ${filter === DOG_STATUS.FOUND ? 'active' : ''}`}
                    onClick={() => setFilter(DOG_STATUS.FOUND)}
                >
                    已找到 ({stats.found})
                </button>
            </div>

            {/* 我的通報列表 */}
            <div className="profile-dogs-section">
                <h3>我的通報</h3>
                
                {/* 空資料判斷 */}
                {filteredDogs.length === 0 ? (
                    <div className="profile-empty">
                        <p>尚無通報資料</p>
                        <p style={{ fontSize: '0.875rem', color: '#666' }}>
                            {filter !== 'all' 
                                ? '切換到「全部」查看所有通報' 
                                : '點選上方「發佈走失資訊」開始通報'}
                        </p>
                    </div>
                ) : (
                    <div className="profile-dogs-list">
                        {filteredDogs.map(dog => (
                            <div key={dog.id} className="profile-dog-card">
                                {/* 圖片 */}
                                <div className="profile-dog-image">
                                    {dog.imageUrls && dog.imageUrls.length > 0 ? (
                                        <img src={dog.imageUrls[0]} alt={dog.name} loading="lazy"/>
                                    ) : (
                                        <div className="no-image">無照片</div>
                                    )}
                                    {dog.status === 'found' && (
                                        <div className="found-badge">已找到</div>
                                    )}
                                </div>

                                {/* 資訊 */}
                                <div className="profile-dog-info">
                                    <div className="profile-dog-header">
                                        <h4>{dog.name}</h4>
                                    </div>
                                    
                                    <div className="profile-dog-details">
                                        <p>地點｜{dog.location}</p>
                                        <p>特徵｜{dog.breed} · {dog.color} · {dog.gender}</p>
                                        <p>描述｜{dog.description}</p>
                                        <p>{getDaysLost(dog.createdAt) !== null ? `走失 ${getDaysLost(dog.createdAt)} 天` : '日期未知'}</p>
                                    </div>

                                    {/* 操作按鈕 */}
                                    <div className="profile-dog-actions">
                                        <button 
                                            className="action-btn status-btn"
                                            onClick={() => handleToggleStatus(dog.id, dog.status)}
                                        >
                                            {dog.status === DOG_STATUS.FOUND ? '改回尋找中' : '標記已找到'}
                                        </button>
                                        <button 
                                            className="action-btn edit-btn"
                                            onClick={() => handleEdit(dog)}
                                        >
                                            編輯
                                        </button>
                                        <button 
                                            className="action-btn delete-btn"
                                            onClick={() => handleDelete(dog.id)}
                                        >
                                            刪除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;