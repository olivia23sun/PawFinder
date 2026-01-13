import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import toast from 'react-hot-toast';
import TAIWAN_CITIES from '../../constants/taiwanCities';
import './AddDogForm.css';
import { useAuth } from '../../contexts/AuthContext';
import DOG_STATUS from '../../constants/status';

const AddDogForm = ({ onSuccess }) => {
  const { currentUser, userProfile } = useAuth();
  
  // ========== 表單狀態管理 ==========
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    color: '',
    age: '',
    gender: '',
    collar: '',
    location: '',
    lostDate: '',
    contactName: '',
    contactPhone: '',
    description: ''
  });
  
  // ========== 自動填入會員資料 ==========
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        contactName: userProfile.displayName || '',
        contactPhone: userProfile.phone || ''
      }));
    }
  }, [userProfile]);

  const [imageFiles, setImageFiles] = useState([]);      // 圖片檔案陣列
  const [imagePreviews, setImagePreviews] = useState([]); // 預覽圖網址陣列
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().split('T')[0];  // 今天日期（YYYY-MM-DD）

  // ========== 處理一般輸入欄位 ==========
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ========== 處理圖片選擇 ==========
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // 檢查是否超過3張
    if (imageFiles.length + files.length > 3) {
      setError('最多只能上傳 3 張照片');
      return;
    }

    // 驗證每個檔案
    for (let file of files) {
      // 驗證檔案大小 (2MB = 2 * 1024 * 1024 bytes)
      if (file.size > 2 * 1024 * 1024) {
        setError('每張圖片大小不能超過 2MB');
        return;
      }

      // 驗證檔案類型
      if (!file.type.startsWith('image/')) {
        setError('請選擇圖片檔案');
        return;
      }
    }

    setError('');

    // ========== 產生預覽圖 ==========
    const newPreviews = [];
    let loadedCount = 0;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        loadedCount++;
        
        // 當所有檔案都讀取完成後更新狀態
        if (loadedCount === files.length) {
          setImageFiles(prev => [...prev, ...files]);
          setImagePreviews(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);  // 讀取為 Base64
    });
  };

  // ========== 刪除單張圖片 ==========
  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ========== 上傳單張圖片到 Firebase Storage ==========
  const uploadImage = async (file) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `dogs/${timestamp}_${randomStr}_${file.name}`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, file);  // 上傳檔案
    const url = await getDownloadURL(storageRef);  // 取得下載網址
    return url;
  };

  // ========== 上傳所有圖片 ==========
  const uploadAllImages = async (files) => {
    const uploadPromises = files.map(file => uploadImage(file));
    return await Promise.all(uploadPromises);  // 平行上傳
  };

  // ========== 表單驗證 ==========
  const validateForm = () => {
    const phoneRegex = /^09\d{8}$/;
    
    // 定義必填欄位
    const requiredFields = {
      name: '狗狗名字',
      breed: '品種',
      color: '顏色',
      age: '年齡',
      gender: '性別',
      collar: '項圈',
      location: '走失地點',
      lostDate: '走失日期',
      contactName: '聯絡人',
      contactPhone: '聯絡電話'
    };

    // 檢查所有必填欄位
    for (let [field, label] of Object.entries(requiredFields)) {
      if (!formData[field] || !formData[field].toString().trim()) {
        setError(`❌ 請輸入${label}`);
        return false;
      }
    }

    // 驗證日期不能是未來
    const selectedDate = new Date(formData.lostDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
      setError('❌ 走失日期不能選擇未來的日期！');
      return false;
    }
    
    // 驗證手機號碼格式
    if (!phoneRegex.test(formData.contactPhone.replace(/[- ]/g, ''))) {
      setError('請輸入有效的手機號碼（例：0912345678）');
      return false;
    }
    
    // 檢查至少上傳一張圖片
    if (imageFiles.length === 0) {
      setError('請至少上傳 1 張毛孩照片');
      return false;
    }
    
    return true;
  };

  // ========== 送出表單 ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. 上傳圖片到 Firebase Storage
      const imageUrls = await uploadAllImages(imageFiles);

      // 2. 準備資料
      const dogData = {
        ...formData,
        imageUrls,  // 圖片網址陣列
        createdAt: Timestamp.now(),  // 建立時間戳記
        status: DOG_STATUS.LOST,  // 預設狀態
        userId: currentUser.uid,  // 紀錄發布者ID
        userEmail: currentUser.email  // 紀錄發布者Email
      };

      // 3. 新增到 Firestore
      await addDoc(collection(db, 'lostDogs'), dogData);

      // 4. 重置表單
      setFormData({
        name: '',
        breed: '',
        color: '',
        age: '',
        gender: '',
        collar: '',
        location: '',
        lostDate: '',
        contactName: userProfile?.displayName || '',
        contactPhone: userProfile?.phone || '',
        description: ''
      });
      setImageFiles([]);
      setImagePreviews([]);

      toast.success('✅ 通報成功！');
      
      // 5. 通知父組件更新列表
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('新增失敗:', err);
      setError('新增失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container" id="add-dog-form">
      <h2 className="form-title">- 通報走失毛孩 -</h2>

      <form onSubmit={handleSubmit} className="form">
        
        {/* 圖片上傳 */}
        <div className="form-group">
          <label className="form-label">照片({imageFiles.length}/3)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="form-file-input"
          />
          
          {/* 圖片預覽區 */}
          {imagePreviews.length > 0 && (
            <div className="form-previews">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="form-preview-item">
                  <img 
                    src={preview} 
                    alt={`預覽 ${index + 1}`} 
                    className="form-preview" 
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="form-remove-btn"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 基本資料 */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">名字</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="例：小白"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">品種</label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              placeholder="例：柴犬"
              className="form-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">毛色</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="例：白色"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">年齡</label>
            <input
              type="text"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="例：3歲"
              className="form-input"
            />
          </div>
        </div>

        {/* 性別 */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">性別</label>
            <div className="form-radio-group">
              <label className="form-radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="公"
                  checked={formData.gender === '公'}
                  onChange={handleChange}
                />
                公
              </label>
              <label className="form-radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="母"
                  checked={formData.gender === '母'}
                  onChange={handleChange}
                />
                母
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">有無配戴項圈</label>
            <div className="form-radio-group">
              <label className="form-radio-label">
                <input
                  type="radio"
                  name="collar"
                  value="有項圈"
                  checked={formData.collar === '有項圈'}
                  onChange={handleChange}
                />
                有項圈
              </label>
              <label className="form-radio-label">
                <input
                  type="radio"
                  name="collar"
                  value="無項圈"
                  checked={formData.collar === '無項圈'}
                  onChange={handleChange}
                />
                無項圈
              </label>
            </div>
          </div>
        </div>

        {/* 走失資訊 */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">走失地點</label>
            <select 
              name="location" 
              id="region" 
              value={formData.location} 
              onChange={handleChange} 
              className="form-select"
            >
              <option value="">全部地區</option>
              {TAIWAN_CITIES.map((city) => (
                <option 
                  key={city.value}
                  value={city.value}
                >
                  {city.label}
                </option>
              ))}
            </select>            
          </div>

          <div className="form-group">
            <label className="form-label">走失日期</label>
            <input
              type="date"
              name="lostDate"
              value={formData.lostDate}
              onChange={handleChange}
              className="form-input"
              max={today}
            />
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">聯絡人</label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder="您的名字"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">聯絡電話</label>
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              placeholder="0912345678"
              className="form-input"
            />
          </div>
        </div>

        {/* 詳細描述 */}
        <div className="form-group">
          <label className="form-label">詳細描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="例：脖子有戴紅色項圈，個性活潑親人..."
            rows="4"
            className="form-textarea"
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        {/* 送出按鈕 */}
        <button 
          type="submit" 
          disabled={loading}
          className="form-submit-btn"
        >
          {loading ? '通報中...' : '送出通報'}
        </button>
      </form>
    </div>
  );
};

export default AddDogForm;