import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import './AddDogForm.css'; // 共用樣式

function EditDogForm({ dog, onComplete, onCancel }) {
    const [formData, setFormData] = useState({
    name: dog.name || '',
    breed: dog.breed || '',
    color: dog.color || '',
    age: dog.age || '',
    gender: dog.gender || '',
    location: dog.location || '',
    lostDate: dog.lostDate || '',
    contactName: dog.contactName || '',
    contactPhone: dog.contactPhone || '',
    description: dog.description || ''
    });
    // 現有圖片（從資料庫讀取）
    const [existingImages, setExistingImages] = useState(dog.imageUrls || []);
    
    // 新上傳的圖片
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const today = new Date().toISOString().split('T')[0];
    // 計算總圖片數量
    const totalImages = existingImages.length + newImageFiles.length;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);

        // 檢查是否超過 3 張
        if (totalImages + files.length > 3) {
            setError(`最多只能有 3 張照片（目前：${totalImages} 張）`);
            return;
        }
        // 驗證每個檔案
        for (let file of files) {
            if (file.size > 2 * 1024 * 1024) {
                setError('每張圖片大小不能超過 2MB');
                return;
            }
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
                
                if (loadedCount === files.length) {
                    setNewImageFiles(prev => [...prev, ...files]);
                    setNewImagePreviews(prev => [...prev, ...newPreviews]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        // 清空舊錯誤
        setError('');
    
        // 驗證必填欄位
        if (!formData.name.trim()) {
            setError('❌ 請輸入狗狗名字');
            return;
        }
        if (!formData.breed.trim()) {
            setError('❌ 請輸入品種');
            return;
        }
        if (!formData.location.trim()) {
            setError('❌ 請輸入走失地點');
            return;
        }

        setLoading(true);

        try {
            // 1. 上傳新圖片
            const newImageUrls = await uploadAllNewImages(newImageFiles);

            // 2. 合併現有圖片 + 新圖片網址
            const allImageUrls = [...existingImages, ...newImageUrls];

            // 3. 更新 Firestore
            const dogRef = doc(db, 'lostDogs', dog.id);
            await updateDoc(dogRef, {
                ...formData,
                imageUrls: allImageUrls,
                userId: dog.userId,       // ✅ 加這行
                userEmail: dog.userEmail, // ✅ 加這行
                status: dog.status || 'lost'
            });

            alert('更新成功！');
            onComplete();
        } catch (error) {
            console.error('更新失敗:', error);
            alert('更新失敗，請稍後再試');
        } finally {
            setLoading(false);
        }
    };
    // 刪除現有圖片
    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    // 刪除剛上傳但還沒儲存的新圖片
    const removeNewImage = (index) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

        // 上傳單張圖片
    const uploadImage = async (file) => {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const filename = `dogs/${timestamp}_${randomStr}_${file.name}`;
        const storageRef = ref(storage, filename);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
    };

    // 上傳所有新圖片
    const uploadAllNewImages = async (files) => {
        if (files.length === 0) return [];
        const uploadPromises = files.map(file => uploadImage(file));
        return await Promise.all(uploadPromises);
    };

    const handleMarkAsFound = async () => {
        if (!window.confirm('確定要標記為已尋獲嗎？')) {
            return;
        }

        setLoading(true);

        try {
            const dogRef = doc(db, 'lostDogs', dog.id);
            await updateDoc(dogRef, {
                status: 'found',
                foundAt: new Date()
            });

            alert('✅ 已標記為尋獲！');
            onComplete();
        } catch (error) {
            console.error('❌ 標記失敗:', error);
            alert('標記失敗：' + error.message);
        } finally {
            setLoading(false);
        }
};

    return (

        <div className="add-dog-form-container" id="edit-dog-form">
            <form onSubmit={handleSubmit} className="add-dog-form">
            <h2 className="add-dog-form-title">✏️ 編輯通報資訊</h2>
            <button 
                type="button" 
                className="btn-found"
                onClick={handleMarkAsFound}
                disabled={loading}
            >
            ✅ 標記為已尋獲
            </button>

      {/* 圖片管理區 */}
                <div className="add-dog-form-group">
                    <label className="add-dog-form-label">
                        狗狗照片 ({totalImages}/3)
                    </label>

                    {/* 現有圖片 */}
                    {existingImages.length > 0 && (
                        <div>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                現有照片：
                            </p>
                            <div className="add-dog-form-previews">
                                {existingImages.map((url, index) => (
                                    <div key={`existing-${index}`} className="add-dog-form-preview-item">
                                        <img 
                                            src={url} 
                                            alt={`現有照片 ${index + 1}`} 
                                            className="add-dog-form-preview" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(index)}
                                            className="add-dog-form-remove-btn"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 新上傳的圖片 */}
                    {newImagePreviews.length > 0 && (
                        <div style={{ marginTop: '15px' }}>
                            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                                新增照片：
                            </p>
                            <div className="add-dog-form-previews">
                                {newImagePreviews.map((preview, index) => (
                                    <div key={`new-${index}`} className="add-dog-form-preview-item">
                                        <img 
                                            src={preview} 
                                            alt={`新增照片 ${index + 1}`} 
                                            className="add-dog-form-preview" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeNewImage(index)}
                                            className="add-dog-form-remove-btn"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 上傳按鈕 */}
                    {totalImages < 3 && (
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="add-dog-form-file-input"
                            style={{ marginTop: '15px' }}
                        />
                    )}
                </div>

            <div className="add-dog-form-row">
                <div className="add-dog-form-group">
                    <label className="add-dog-form-label">名字</label>
                        <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
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

                    <div className="add-dog-form-group">
                <label className="add-dog-form-label">性別</label>
                <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="add-dog-form-select"
                >
                    <option value="">請選擇</option>
                    <option value="公">公</option>
                    <option value="母">母</option>
                </select>
                </div>
            </div>

            <div className="add-dog-form-group">
            <label className="add-dog-form-label">走失地點</label>
                <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="add-dog-form-input"
                />
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

            <div className="add-dog-form-row">
                <div className="add-dog-form-group">
                <label className="add-dog-form-label">聯絡人姓名</label>
                <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
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
                    className="add-dog-form-input"
                />
                </div>
            </div>

            <div className="add-dog-form-group">
                    <label className="add-dog-form-label">詳細描述</label>
                    <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="請描述狗狗的特徵、習性等..."
                className="add-dog-form-textarea"
                    />
            </div>
            
            {error && <div className="add-dog-form-error">{error}</div>}

            <div className="add-dog-form-row">

                <button 
                type="submit" 
                className="add-dog-form-submit-btn"
                disabled={loading}
                style={{
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
                >
                {loading ? '更新中...' : '💾 儲存修改'}
                </button>

                <button 
                type="button" 
                className="add-dog-form-submit-btn"
                onClick={onCancel}
                disabled={loading}
                style={{
                    backgroundColor: '#f44336'
                }}
                >
                ❌ 取消
                </button>
            </div>
            </form>
        </div>
    );
}

export default EditDogForm ;