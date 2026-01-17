import { useState, useEffect } from 'react';
import { collection, deleteDoc, getDocs, doc } from 'firebase/firestore';
import { db } from './firebase';
import Header from './components/Header/Header';
import HeroCarousel from './components/HeroCarousel/HeroCarousel';
import FilterSection from './components/FilterSection/FilterSection';
import './index.css';
import DogCard from './components/DogCard/DogCard';
import EditDogForm from './components/DogForm/EditDogForm';
import AddDogForm from './components/DogForm/AddDogForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Profile from './components/Profile/Profile';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { query, orderBy } from 'firebase/firestore';

function AppContent() {
  const { currentUser } = useAuth();
  const headerHeight =
    document.querySelector('header')?.offsetHeight || 0;

  // ========== State 管理 ==========
  const [dogs, setDogs] = useState([]);
  const [filteredDogs, setFilteredDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDog, setEditingDog] = useState(null);

  // ========== 從 URL hash 讀取初始頁面 ==========
  const getInitialPage = () => {
    const hash = window.location.hash.slice(1);
    if (hash === 'profile') {
      return hash;
    }
    return 'home';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());

  // ========== 監聽 URL hash 變化 ==========
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'profile' || hash === 'home' || hash === '') {
        setCurrentPage(hash || 'home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () =>
      window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ========== 初始化：從 Firebase 載入資料 ==========
  useEffect(() => {
    fetchDogs();
  }, []);

  // ========== 從 Firestore 讀取所有通報 ==========
  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError('');

      const q = query(collection(db, 'lostDogs'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const dogsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
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
      result = result.filter(
        (dog) => dog.location === filters.region
      );
    }

    // 項圈篩選
    if (filters.collar) {
      result = result.filter(
        (dog) => dog.collar === filters.collar
      );
    }

    // 時間篩選
    if (filters.date) {
      const now = new Date();
      const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );

      result = result.filter((dog) => {
        if (!dog.createdAt) return false;

        const dogDate = dog.createdAt.toDate();
        const daysDiff = Math.floor(
          (now - dogDate) / (1000 * 60 * 60 * 24)
        );

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

    // 關鍵字搜尋
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (dog) =>
          dog.name?.toLowerCase().includes(searchLower) ||
          dog.breed?.toLowerCase().includes(searchLower) ||
          dog.description
            ?.toLowerCase()
            .includes(searchLower) ||
          dog.color?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredDogs(result);
  };

  // ========== 新增成功 ==========
  const handleDogAdded = () => {
    fetchDogs();
    setShowForm(false);
  };

  // ========== Header 發布 ==========
  const handleShowForm = () => {
    setEditingDog(null);
    setShowForm(!showForm);

    if (!showForm) {
      window.location.hash = 'home';
      setCurrentPage('home');
    }

    setTimeout(() => {
      const formElement =
        document.getElementById('add-dog-form');
      if (formElement) {
        const y = formElement.offsetTop - headerHeight;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  // ========== 編輯 ==========
  const handleEdit = (dog) => {
    if (currentUser && dog.userId === currentUser.uid) {
      setEditingDog(null);
      setShowForm(false);
      setTimeout(() => {
        setEditingDog(dog);

        setTimeout(() => {
          const formElement =
            document.getElementById('edit-dog-form');
          if (formElement) {
            const y =
              formElement.offsetTop - headerHeight;
            window.scrollTo({
              top: y,
              behavior: 'smooth',
            });
          }
        }, 100);
      }, 10);
    } else {
      toast.error('⚠️ 您只能編輯自己發布的通報');
    }
  };

  // ========== 刪除 ==========
  const handleDelete = async (dogId, userId) => {
    if (!currentUser) {
      toast.error('⚠️ 請先登入');
      return;
    }

    if (currentUser.uid !== userId) {
      toast.error('⚠️ 您只能刪除自己發布的通報');
      return;
    }

    if (window.confirm('確定要刪除這筆通報嗎？')) {
      try {
        await deleteDoc(doc(db, 'lostDogs', dogId));
        await fetchDogs();
        toast.success('刪除成功！');
      } catch (error) {
        console.error('❌ 刪除失敗:', error);
        toast.error('刪除失敗，請稍後再試');
      }
    }
  };

  // ========== 編輯完成 ==========
  const handleEditComplete = () => {
    setEditingDog(null);
    fetchDogs();
  };

  // ========== 回到首頁 ==========
  const handleGoHome = () => {
    setShowForm(false);
    setEditingDog(null);
    setCurrentPage('home');
    window.location.hash = 'home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ========== 顯示個人中心 ==========
  const handleShowProfile = () => {
    setShowForm(false);
    setEditingDog(null);
    setCurrentPage('profile');
    window.location.hash = 'profile';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProfileUpdate = () => {
    fetchDogs();
  };

  return (
    <div className="App">
      <Header
        onShowForm={handleShowForm}
        showForm={showForm}
        onGoHome={handleGoHome}
        onShowProfile={handleShowProfile}
      />

      {currentPage === 'profile' && (
        <Profile
          onEditDog={handleEdit}
          onUpdate={handleProfileUpdate}
        />
      )}

      {currentPage === 'home' && (
        <>
          <HeroCarousel />
          <FilterSection
            onFilterChange={handleFilterChange}
          />

          <div className="container">
            {/* 錯誤訊息顯示 */}
            {error && (
              <div
                style={{
                  padding: '1.25rem',
                  background: '#fee',
                  color: '#c33',
                  borderRadius: '0.5rem',
                  margin: '1.25rem 0',
                  textAlign: 'center',
                  border: '1px solid #fcc',
                }}
              >
                <p style={{ margin: '0 0 0.625rem 0' }}>
                  {error}
                </p>
                <button
                  onClick={fetchDogs}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#c33',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                  }}
                >
                  重試
                </button>
              </div>
            )}

            {/* 編輯表單 */}
            {editingDog && (
              <div id="edit-dog-form">
                <EditDogForm
                  dog={editingDog}
                  onComplete={handleEditComplete}
                  onCancel={() =>
                    setEditingDog(null)
                  }
                />
              </div>
            )}

            {/* 新增表單 */}
            {showForm && (
              <AddDogForm onSuccess={handleDogAdded} />
            )}

            {/* 載入或列表 */}
            {loading ? (
              <p
                style={{
                  textAlign: 'center',
                  padding: '2.5rem',
                }}
              >
                載入中...
              </p>
            ) : (
              <>
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '1.12rem',
                    color: '#666',
                    marginBottom: '1.25rem',
                    fontWeight: '500',
                  }}
                >
                  顯示{' '}
                  <strong
                    style={{
                      color: 'rgb(80,80,80)',
                      fontSize: '1.87rem',
                    }}
                  >
                    {filteredDogs.length}
                  </strong>{' '}
                  隻毛孩
                </p>

                {filteredDogs.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem',
                    }}
                  >
                    <p>
                      {dogs.length === 0
                        ? '目前沒有走失毛孩資料'
                        : '沒有符合條件的毛孩 😢'}
                    </p>
                  </div>
                ) : (
                  <section className="cards-grid">
                    {filteredDogs.map((dog) => (
                      <DogCard
                        key={dog.id}
                        dog={dog}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        currentUserId={
                          currentUser?.uid
                        }
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ========== App 主元件 ==========
function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        reverseOrder={false}
      />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
