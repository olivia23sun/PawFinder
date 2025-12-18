import { useState,useEffect } from 'react';
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
  // 改用 useState（之後會從 Firebase 讀取）
  const { currentUser } = useAuth(); 
  const [dogs, setDogs] = useState([]);
  const [filteredDogs, setFilteredDogs] = useState([]);
  const [loading, setLoading] = useState(true); 
  const [showForm, setShowForm] = useState(false); 
  const [editingDog, setEditingDog] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [error, setError] = useState(''); 

// 從 Firebase 讀取資料
  useEffect(() => {
    fetchDogs();
  }, []);

  // 抽出成獨立函數（可重複使用）
  const fetchDogs = async () => {
    try {
      setLoading(true);
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

      // ✅ 判斷錯誤類型
      if (error.code === 'unavailable') {
          setError('⚠️ 網路連線失敗，請檢查您的網路');
      } else {
          setError('❌ 資料載入失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  // 處理篩選
  const handleFilterChange = (filters) => {
    let result = [...dogs];

    // 1. 地區篩選
    if (filters.region) {
      result = result.filter(dog => dog.location === filters.region);
    }

    // 2. 項圈篩選
    if (filters.collar) {
      result = result.filter(dog => dog.collar === filters.collar);
    }

    // 3. 時間篩選
    if (filters.date) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      result = result.filter(dog => {
        if (!dog.createdAt) return false; //??
      
        const dogDate = dog.createdAt.toDate();
        const daysDiff = Math.floor((now - dogDate) / (1000 * 60 * 60 * 24)); //??

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

    // 4. 關鍵字搜尋（搜尋名字、品種、描述）
    if (filters.search) {
      const searchLower = filters.search.toLowerCase(); //??
      result = result.filter(dog => 
        dog.name?.toLowerCase().includes(searchLower) ||
        dog.breed?.toLowerCase().includes(searchLower) ||
        dog.description?.toLowerCase().includes(searchLower) ||
        dog.color?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDogs(result);
  };

    // 新增成功後的回調
  const handleDogAdded = () => {
    fetchDogs();  // 重新讀取資料
    setShowForm(false);  // 關閉表單
  };
  
  //處理 Header 按鈕點擊
  const handleShowForm = () => {
    setEditingDog(null);
    if(showForm){
      setShowForm(false);
    }else{
      setShowForm(true);
    }
    // 延遲一下，等表單渲染出來後再滾動
    setTimeout(() => {
      document.getElementById('add-dog-form')?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }, 100);
  };
const handleEdit = (dog) => {

  // ✅ 檢查權限：只有發布者可以編輯
  if (currentUser && dog.userId === currentUser.uid) {
  // ✅ 先清空，再設定新資料（強制重新渲染）
  setEditingDog(null);
  setShowForm(false);
  setShowProfile(false);
  
  setTimeout(() => {
    setEditingDog(dog);
    
    // 再次延遲，等待表單渲染
    setTimeout(() => {
      const formElement = document.getElementById('edit-dog-form');
      
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, 10);
  }else {
      alert('⚠️ 您只能編輯自己發布的通報');
    }
};

  // ========== 新增：刪除處理 ==========
  const handleDelete = async (dogId, userId) => {

       // ✅ 檢查權限：只有發布者可以刪除
    if (!currentUser) {
      alert('⚠️ 請先登入');
      return;
    }

    if (currentUser.uid !== userId) {
      alert('⚠️ 您只能刪除自己發布的通報');
      return;
    }

    if (window.confirm('確定要刪除這筆通報嗎？')) {// 使用者點擊「確定」會執行這裡
      try {
        await deleteDoc(doc(db, 'lostDogs', dogId));
        await fetchDogs();
        alert('✅ 刪除成功！');
      } catch (error) {
        console.error('❌ 刪除失敗:', error);
        
        // 根據錯誤類型顯示不同訊息
        if (error.code === 'permission-denied') {
          alert('❌ 權限不足，無法刪除');
        } else if (error.code === 'unavailable') {
          alert('❌ 網路連線失敗，請檢查網路');
        } else {
          alert('❌ 刪除失敗：' + error.message);
        }
      }
    }
  };

  // ========== 新增：編輯完成回調 ==========
  const handleEditComplete = () => {
    setEditingDog(null);
    fetchDogs();
  };

  const handleGoHome = () => {
    setShowForm(false);      // 關閉新增表單
    setEditingDog(null);     // 關閉編輯表單
    setShowProfile(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });  // 滾動到頂部
  };

    const handleShowProfile = () => {
    setShowForm(false);
    setEditingDog(null);
    setShowProfile(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="App">
      <Header onShowForm={handleShowForm} showForm={showForm} onGoHome={handleGoHome}onShowProfile={handleShowProfile}/>
       {/* ✅ 條件顯示：個人中心 or 首頁 */}
      {showProfile ? (
        <Profile />
      ) : (
        <>
      <HeroCarousel />
      <FilterSection onFilterChange={handleFilterChange} />


      <div className="container">
        {error && (
          <div style={{
            padding: '20px',
            background: '#fee',
            color: '#c33',
            borderRadius: '8px',
            margin: '20px',
            textAlign: 'center'
          }}>
            {error}
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

        {/* 表單（條件顯示）*/}
        {showForm && (
          <AddDogForm onSuccess={handleDogAdded}  />
        )}
        
        {loading ? 
        (<p style={{ textAlign: 'center', padding: '40px' }}>載入中...</p>) :
        ( 
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
                            ? '目前沒有走失狗狗資料，請點選上方按鈕新增測試資料'
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
