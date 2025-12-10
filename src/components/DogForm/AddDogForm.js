import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import TAIWAN_CITIES from '../../constants/taiwanCities';
import './AddDogForm.css';
import { useAuth } from '../../contexts/AuthContext';

function AddDogForm({ onSuccess }) {
  const { currentUser, userProfile } = useAuth();
  
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
  
  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        contactName: userProfile.displayName || '',
        contactPhone: userProfile.phone || ''
      }));
    }
  }, [userProfile]);

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const today = new Date().toISOString().split('T')[0];

  // 處理一般輸入欄位
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

 const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // 檢查是否超過3張
    if (imageFiles.length + files.length > 3) {
      setError('最多只能上傳 3 張照片');
      return;
    }

    // 驗證每個檔案
    for (let file of files) {
      // 驗證檔案大小 (2MB)
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

    // 產生預覽圖
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
      reader.readAsDataURL(file);
    });
  };

    // 刪除單張圖片
  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  
  // 上傳單張圖片到 Firebase Storage
  const uploadImage = async (file) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const filename = `dogs/${timestamp}_${randomStr}_${file.name}`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  };

    // 上傳所有圖片
  const uploadAllImages = async (files) => {
    const uploadPromises = files.map(file => uploadImage(file));
    return await Promise.all(uploadPromises);
  };

  // 表單驗證
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

    const selectedDate = new Date(formData.lostDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        setError('❌ 走失日期不能選擇未來的日期！');
        return false;
    }
    
    if (!phoneRegex.test(formData.contactPhone.replace(/[- ]/g, ''))) {
    setError('請輸入有效的手機號碼（例：0912345678）');
    return false;
    }
    
    if (imageFiles.length === 0) {
      setError('請至少上傳 1 張狗狗照片');
      return false;
    }
    return true;
  };

  // 送出表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. 上傳圖片
      const imageUrls = await uploadAllImages(imageFiles);

      // 2. 準備資料（imageUrls 改為陣列，同時保留 imageUrl 向後相容）
      // ✅ 加入會員資訊
      const dogData = {
        ...formData,
        imageUrls,
        createdAt: Timestamp.now(),
        status: 'lost',
        userId: currentUser.uid,  // ✅ 紀錄發布者ID
        userEmail: currentUser.email  // ✅ 紀錄發布者Email
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
        contactName: userProfile?.displayName || '',  // ✅ 保留會員資訊
        contactPhone: userProfile?.phone || '',  // ✅ 保留會員資訊
        description: ''
      });
      setImageFiles(null);
      setImagePreviews(null);

      alert('✅ 通報成功！');
      
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
    <div className="add-dog-form-container" id="add-dog-form">
      <h2 className="add-dog-form-title">🐕 通報走失狗狗</h2>

      <form onSubmit={handleSubmit} className="add-dog-form">
        
        {/* 圖片上傳 */}
        <div className="add-dog-form-group">
          <label className="add-dog-form-label">照片({imageFiles.length}/3)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="add-dog-form-file-input"
          />
          {/* 圖片預覽區 */}
          {imagePreviews.length > 0 && (
            <div className="add-dog-form-previews">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="add-dog-form-preview-item">
                  <img 
                    src={preview} 
                    alt={`預覽 ${index + 1}`} 
                    className="add-dog-form-preview" 
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="add-dog-form-remove-btn"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 基本資料 */}
        <div className="add-dog-form-row">
          <div className="add-dog-form-group">
            <label className="add-dog-form-label">名字</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="例：小白"
              className="add-dog-form-input"
            />
          </div>

          <div className="add-dog-form-group">
            <label className="add-dog-form-label">品種</label>
            <input
              type="text"
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              placeholder="例：柴犬"
              className="add-dog-form-input"
            />
          </div>
        </div>

        <div className="add-dog-form-row">
          <div className="add-dog-form-group">
            <label className="add-dog-form-label">毛色</label>
            <input
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              placeholder="例：白色"
              className="add-dog-form-input"
            />
          </div>

          <div className="add-dog-form-group">
            <label className="add-dog-form-label">年齡</label>
            <input
              type="text"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="例：3歲"
              className="add-dog-form-input"
            />
          </div>
        </div>

        {/* 性別 */}
        <div className="add-dog-form-row">
          <div className="add-dog-form-group">
            <label className="add-dog-form-label">性別</label>
            <div className="add-dog-form-radio-group">
              <label className="add-dog-form-radio-label">
                <input
                  type="radio"
                  name="gender"
                  value="公"
                  checked={formData.gender === '公'}
                  onChange={handleChange}
                />
                公
              </label>
              <label className="add-dog-form-radio-label">
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

          <div className="add-dog-form-group">
            <label className="add-dog-form-label">有無配戴項圈</label>
            <div className="add-dog-form-radio-group">
              <label className="add-dog-form-radio-label">
                <input
                  type="radio"
                  name="collar"
                  value="有項圈"
                  checked={formData.collar === '有項圈'}
                  onChange={handleChange}
                />
                有項圈
              </label>
              <label className="add-dog-form-radio-label">
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
        <div className="add-dog-form-row">
          <div className="add-dog-form-group">
            <label className="add-dog-form-label">走失地點</label>
            <select 
              name="location" 
              id="region" 
              value={formData.location} 
              onChange={handleChange} 
              className="add-dog-form-select"
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

          <div className="add-dog-form-group">
            <label className="add-dog-form-label">走失日期</label>
            <input
              type="date"
              name="lostDate"
              value={formData.lostDate}
              onChange={handleChange}
              className="add-dog-form-input"
              max={today}
            />
          </div>
        </div>

        {/* 聯絡資訊 */}
        <div className="add-dog-form-row">
          <div className="add-dog-form-group">
            <label className="add-dog-form-label">聯絡人</label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              placeholder="您的名字"
              className="add-dog-form-input"
            />
          </div>

          <div className="add-dog-form-group">
            <label className="add-dog-form-label">聯絡電話</label>
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              placeholder="0912345678"
              className="add-dog-form-input"
            />
          </div>
        </div>

        {/* 詳細描述 */}
        <div className="add-dog-form-group">
          <label className="add-dog-form-label">詳細描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="例：脖子有戴紅色項圈，個性活潑親人..."
            rows="4"
            className="add-dog-form-textarea"
          />
        </div>

        {error && <div className="add-dog-form-error">{error}</div>}

        {/* 送出按鈕 */}
        <button 
          type="submit" 
          disabled={loading}
          className="add-dog-form-submit-btn"
        >
          {loading ? '通報中...' : '送出通報'}
        </button>
      </form>
    </div>
  );
}

export default AddDogForm;