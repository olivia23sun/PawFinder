import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import './Profile.css';

const Profile = () => {
    const { currentUser, userProfile } = useAuth();
    const [myDogs, setMyDogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, lost, found

    // 載入我的通報
    useEffect(() => {
        if (currentUser) {
            fetchMyDogs();
        }
    }, [currentUser]);

    const fetchMyDogs = async () => {
        try {
            setLoading(true);
            
            // 查詢：只抓當前使用者的通報
            const q = query(
                collection(db, 'lostDogs'),//指定集合
                where('userId', '==', currentUser.uid), //篩選條件
                orderBy('createdAt', 'desc') //排序方式
                //desc降序排列（由新到舊、由大到小），相反是 'asc'（升序）。
            );
            
            //query() 建立查詢條件
            //getDocs(q) 才真正執行查詢
            
            const snapshot = await getDocs(q);
            const dogsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setMyDogs(dogsData);
            console.log('✅ 成功載入我的通報:', dogsData.length, '筆');
        } catch (error) {
            console.error('❌ 載入失敗:', error);
            alert('載入失敗，請重新整理頁面');
        } finally {
            setLoading(false);
        }
    };

    // 切換狀態（已找到/尋找中）
    const handleToggleStatus = async (dogId, currentStatus) => {
        const newStatus = currentStatus === 'found' ? 'lost' : 'found';
        const confirmMsg = newStatus === 'found' 
            ? '確定要標記為「已找到」嗎？' 
            : '確定要改回「尋找中」嗎？';
        
        if (window.confirm(confirmMsg)) {
            try {
                await updateDoc(doc(db, 'lostDogs', dogId), {
                    status: newStatus
                });
                
                // 更新本地狀態
                setMyDogs(prev => prev.map(dog => 
                    dog.id === dogId ? { ...dog, status: newStatus } : dog
                ));
                
                alert(newStatus === 'found' ? '✅ 已標記為「已找到」' : '✅ 已改回「尋找中」');
            } catch (error) {
                console.error('❌ 更新失敗:', error);
                alert('更新失敗，請稍後再試');
            }
        }
    };

    // 刪除通報
    const handleDelete = async (dogId) => {
        if (window.confirm('確定要刪除這筆通報嗎？此操作無法復原！')) {
            try {
                await deleteDoc(doc(db, 'lostDogs', dogId));
                setMyDogs(prev => prev.filter(dog => dog.id !== dogId));
                alert('✅ 刪除成功！');
            } catch (error) {
                console.error('❌ 刪除失敗:', error);
                alert('刪除失敗，請稍後再試');
            }
        }
    };

    // 計算統計資訊
    const stats = {
        total: myDogs.length,
        lost: myDogs.filter(dog => dog.status === 'lost').length,
        found: myDogs.filter(dog => dog.status === 'found').length
    };

    // 過濾通報
    const filteredDogs = myDogs.filter(dog => {
        if (filter === 'all') return true;
        return dog.status === filter;
    });

    // 計算走失天數
    const getDaysLost = (createdAt) => {
        if (!createdAt) return null;
        const now = new Date();
        const lostDate = createdAt.toDate();
        const days = Math.floor((now - lostDate) / (1000 * 60 * 60 * 24));
        return days;
    };

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
                    <div className="stat-number" style={{ color: '#f59e0b' }}>{stats.lost}</div>
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
                    className={`filter-btn ${filter === 'lost' ? 'active' : ''}`}
                    onClick={() => setFilter('lost')}
                >
                    尋找中 ({stats.lost})
                </button>
                <button 
                    className={`filter-btn ${filter === 'found' ? 'active' : ''}`}
                    onClick={() => setFilter('found')}
                >
                    已找到 ({stats.found})
                </button>
            </div>

            {/* 我的通報列表 */}
            <div className="profile-dogs-section">
                <h3>我的通報</h3>
                
                {loading ? (
                    <p style={{ textAlign: 'center', padding: '40px' }}>載入中...</p>
                ) : filteredDogs.length === 0 ? (
                    <div className="profile-empty">
                        <p>😢 尚無通報資料</p>
                        <p style={{ fontSize: '14px', color: '#666' }}>
                            {filter !== 'all' ? '切換到「全部」查看所有通報' : '點選上方「發佈走失資訊」開始通報'}
                        </p>
                    </div>
                ) : (
                    <div className="profile-dogs-list">
                        {filteredDogs.map(dog => (
                            <div key={dog.id} className="profile-dog-card">
                                {/* 圖片 */}
                                <div className="profile-dog-image">
                                    {dog.imageUrls && dog.imageUrls.length > 0 ? (
                                        <img src={dog.imageUrls[0]} alt={dog.name} />
                                    ) : (
                                        <div className="no-image">無照片</div>
                                    )}
                                    {dog.status === 'found' && (
                                        <div className="found-badge">✅ 已找到</div>
                                    )}
                                </div>

                                {/* 資訊 */}
                                <div className="profile-dog-info">
                                    <div className="profile-dog-header">
                                        <h4>{dog.name}</h4>
                                        <span className={`status-badge ${dog.status}`}>
                                            {dog.status === 'found' ? '已找到' : '尋找中'}
                                        </span>
                                    </div>
                                    
                                    <div className="profile-dog-details">
                                        <p>📍 {dog.location}</p>
                                        <p>🐕 {dog.breed} · {dog.color} · {dog.gender}</p>
                                        <p>📅 {getDaysLost(dog.createdAt) !== null ? `走失 ${getDaysLost(dog.createdAt)} 天` : '日期未知'}</p>
                                    </div>

                                    {/* 操作按鈕 */}
                                    <div className="profile-dog-actions">
                                        <button 
                                            className="action-btn status-btn"
                                            onClick={() => handleToggleStatus(dog.id, dog.status)}
                                        >
                                            {dog.status === 'found' ? '改回尋找中' : '✅ 標記已找到'}
                                        </button>
                                        <button 
                                            className="action-btn edit-btn"
                                            onClick={() => window.location.hash = `edit-${dog.id}`}
                                        >
                                            ✏️ 編輯
                                        </button>
                                        <button 
                                            className="action-btn delete-btn"
                                            onClick={() => handleDelete(dog.id)}
                                        >
                                            🗑️ 刪除
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