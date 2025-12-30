import { useState, useEffect } from 'react';
import { collection, deleteDoc, getDocs, doc } from 'firebase/firestore';
import { db } from './firebase';
import Header from './components/Header/Header';
import HeroCarousel from './components/HeroCarousel/HeroCarousel';
import FilterSection from './components/FilterSection/FilterSection';
import './App.css';
import DogCard from './components/DogCard/DogCard';
import EditDogForm from './components/DogForm/EditDogForm'; 
import AddDogForm from './components/DogForm/AddDogForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Profile from './components/Profile/Profile';

function AppContent() {
  const { currentUser } = useAuth(); 
  
  // ========== State 管理 ==========
  const [dogs, setDogs] = useState([]);              // 所有狗狗資料
  const [filteredDogs, setFilteredDogs] = useState([]); // 篩選後的資料
  const [loading, setLoading] = useState(true);      // 載入狀態
  const [error, setError] = useState('');            // 錯誤訊息
  const [showForm, setShowForm] = useState(false);   // 是否顯示新增表單
  const [editingDog, setEditingDog] = useState(null); // 正在編輯的狗狗
  const [showProfile, setShowProfile] = useState(false); // 是否顯示個人中心

  // ========== 初始化：從 Firebase 載入資料 ==========
  useEffect(() => {
    fetchDogs();
  }, []);

  // ========== 從 Firestore 讀取所有通報 ==========
  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const snapshot = await getDocs(collection(db, 'lostDogs'));
      const dogsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDogs(dogsData);
      setFilteredDogs(dogsData);
      console.log('✅ 成功讀取資料:', dogsData);
    } catch (error) {
      console.error('❌ 讀取失敗:', error);
      setError('⚠️ 資料載入失敗，請重新整理頁面');
    } finally {
      setLoading(false);
    }
  };

  // ========== 篩選處理 ==========
  const handleFilterChange = (filters) => {
    let result = [...dogs];

    // 地區篩選
    if (filters.region) {
      result = result.filter(dog => dog.location === filters.region);
    }

    // 項圈篩選
    if (filters.collar) {
      result = result.filter(dog => dog.collar === filters.collar);
    }

    // 時間篩選：計算走失天數
    if (filters.date) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter(dog => {
        if (!dog.createdAt) return false;
      
        const dogDate = dog.createdAt.toDate();
        // 計算天數差：(毫秒差 / 1000 / 60 / 60 / 24)
        const daysDiff = Math.floor((now - dogDate) / (1000 * 60 * 60 * 24));

        switch (filters.date) {
          case 'today':
            return dogDate >= today;
          case 'week':
            return daysDiff <= 7;
          case 'month':
            return daysDiff <= 30;
          default:
            return true;
        }
      });
    }

    // 關鍵字搜尋：支援名字、品種、描述、顏色
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(dog => 
        dog.name?.toLowerCase().includes(searchLower) ||
        dog.breed?.toLowerCase().includes(searchLower) ||
        dog.description?.toLowerCase().includes(searchLower) ||
        dog.color?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDogs(result);
  };

  // ========== 新增成功回調 ==========
  const handleDogAdded = () => {
    fetchDogs();         // 重新讀取資料
    setShowForm(false);  // 關閉表單
  };
  
  // ========== Header「發布按鈕」點擊 ==========
  const handleShowForm = () => {
    setEditingDog(null);  // 清空編輯狀態
    setShowForm(!showForm); // 切換表單顯示
    
    // 延遲滾動，等表單渲染完成
    setTimeout(() => {
      document.getElementById('add-dog-form')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };

  // ========== 編輯按鈕處理 ==========
  const handleEdit = (dog) => {
    // 權限檢查：只有發布者可以編輯
    if (currentUser && dog.userId === currentUser.uid) {
      // 先清空狀態，強制重新渲染
      setEditingDog(null);
      setShowForm(false);
      setShowProfile(false);
      
      // 延遲設定新資料
      setTimeout(() => {
        setEditingDog(dog);
        
        // 再延遲滾動到表單
        setTimeout(() => {
          const formElement = document.getElementById('edit-dog-form');
          if (formElement) {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }, 10);
    } else {
      alert('⚠️ 您只能編輯自己發布的通報');
    }
  };

  // ========== 刪除按鈕處理 ==========
  const handleDelete = async (dogId, userId) => {
    // 權限檢查
    if (!currentUser) {
      alert('⚠️ 請先登入');
      return;
    }

    if (currentUser.uid !== userId) {
      alert('⚠️ 您只能刪除自己發布的通報');
      return;
    }

    // 二次確認
    if (window.confirm('確定要刪除這筆通報嗎？')) {
      try {
        await deleteDoc(doc(db, 'lostDogs', dogId));
        await fetchDogs(); // 重新載入資料
        alert('✅ 刪除成功！');
      } catch (error) {
        console.error('❌ 刪除失敗:', error);
        alert('刪除失敗，請稍後再試');
      }
    }
  };

  // ========== 編輯完成回調 ==========
  const handleEditComplete = () => {
    setEditingDog(null);
    fetchDogs();
  };

  // ========== 回到首頁 ==========
  const handleGoHome = () => {
    setShowForm(false);
    setEditingDog(null);
    setShowProfile(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ========== 顯示個人中心 ==========
  const handleShowProfile = () => {
    setShowForm(false);
    setEditingDog(null);
    setShowProfile(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="App">
      <Header 
        onShowForm={handleShowForm} 
        showForm={showForm} 
        onGoHome={handleGoHome}
        onShowProfile={handleShowProfile}
      />
      
      {/* 條件顯示：個人中心 or 首頁 */}
      {showProfile ? (
        <Profile />
      ) : (
        <>
          <HeroCarousel />
          <FilterSection onFilterChange={handleFilterChange} />

          <div className="container">
            {/* 錯誤訊息顯示 */}
            {error && (
              <div style={{
                padding: '20px',
                background: '#fee',
                color: '#c33',
                borderRadius: '8px',
                margin: '20px 0',
                textAlign: 'center',
                border: '1px solid #fcc'
              }}>
                <p style={{ margin: '0 0 10px 0' }}>{error}</p>
                <button 
                  onClick={fetchDogs}
                  style={{
                    padding: '8px 16px',
                    background: '#c33',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  重試
                </button>
              </div>
            )}

            {/* 編輯表單（條件顯示）*/}
            {editingDog && (
              <div id="edit-dog-form">
                <EditDogForm 
                  dog={editingDog}
                  onComplete={handleEditComplete}
                  onCancel={() => setEditingDog(null)}
                />
              </div>
            )}

            {/* 新增表單（條件顯示）*/}
            {showForm && (
              <AddDogForm onSuccess={handleDogAdded} />
            )}
            
            {/* 載入狀態 or 卡片列表 */}
            {loading ? (
              <p style={{ textAlign: 'center', padding: '40px' }}>載入中...</p>
            ) : (
              <>
                <p style={{ 
                  textAlign: 'center', 
                  fontSize: '18px', 
                  color: '#666',
                  marginBottom: '20px',
                  fontWeight: '500'
                }}>
                  📊 顯示 <strong style={{ color: '#667eea' }}>{filteredDogs.length}</strong> 隻狗狗
                </p>
              
                <section className="cards-grid">
                  {filteredDogs.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '40px' }}>
                      {dogs.length === 0 
                        ? '目前沒有走失狗狗資料'
                        : '沒有符合條件的狗狗 😢'}
                    </p>
                  ) : (
                    filteredDogs.map(dog => (
                      <DogCard 
                        key={dog.id} 
                        dog={dog}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        currentUserId={currentUser?.uid}
                      />
                    ))
                  )}
                </section>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ========== App 主元件：包裝 AuthProvider ==========
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;