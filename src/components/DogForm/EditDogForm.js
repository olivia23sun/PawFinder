import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import toast from 'react-hot-toast';
import DOG_STATUS from '../../constants/status';
import './EditDogForm.css';
import { translateFirebaseError } from '../../utils/errorHelpers';

const EditDogForm = ({ dog, onComplete, onCancel }) => {
    const [formData, setFormData] = useState({
        name: dog.name || '',
        breed: dog.breed || '',
        color: dog.color || '',
        age: dog.age || '',
        gender: dog.gender || '',
        collar: dog.collar || '',
        location: dog.location || '',
        lostDate: dog.lostDate || '',
        contactName: dog.contactName || '',
        contactPhone: dog.contactPhone || '',
        description: dog.description || ''
    });

    const [existingImages, setExistingImages] = useState(dog.imageUrls || []);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [newImagePreviews, setNewImagePreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const today = new Date().toISOString().split('T')[0];
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

        if (totalImages + files.length > 3) {
            toast.error(`最多只能有 3 張照片（目前：${totalImages} 張）`);
            e.target.value = '';
            return;
        }

        for (let file of files) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error('每張圖片大小不能超過 2MB');
                e.target.value = '';
                return;
            }
            
            const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('只支援 JPG、PNG 或 WebP 格式');
                e.target.value = '';
                return;
            }
        }

        setError('');

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

    const removeExistingImage = (index) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index) => {
        setNewImageFiles(prev => prev.filter((_, i) => i !== index));
        setNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImage = async (file) => {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const filename = `dogs/${timestamp}_${randomStr}_${file.name}`;
        const storageRef = ref(storage, filename);

        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
    };

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
                status: DOG_STATUS.FOUND,
                foundAt: new Date()
            });

            toast.success('已標記為尋獲！');
            onComplete();
        } catch (error) {
            const friendlyMessage = translateFirebaseError(error.code);
            toast.error(`發布失敗：${friendlyMessage}`);
            console.error('❌ 標記失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    // ========== 表單驗證（新增完整版）==========
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
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        
        if (selectedDate > todayDate) {
            setError('❌ 走失日期不能選擇未來的日期！');
            return false;
        }
        
        // 驗證手機號碼格式
        if (!phoneRegex.test(formData.contactPhone.replace(/[- ]/g, ''))) {
            setError('❌ 請輸入有效的手機號碼（例：0912345678）');
            return false;
        }
        
        // 檢查至少保留一張圖片
        if (existingImages.length + newImageFiles.length === 0) {
            setError('❌ 請至少保留 1 張毛孩照片');
            return false;
        }

        // 檢查描述字數
        if (formData.description.length > 100) {
            setError('❌ 詳細描述不可超過 100 字');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 執行驗證
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const newImageUrls = await uploadAllNewImages(newImageFiles);
            const allImageUrls = [...existingImages, ...newImageUrls];
            const dogRef = doc(db, 'lostDogs', dog.id);
            await updateDoc(dogRef, {
                ...formData,
                imageUrls: allImageUrls,
                userId: dog.userId,
                userEmail: dog.userEmail,
                status: dog.status || DOG_STATUS.LOST
            });

            toast.success('更新成功！');
            onComplete();
        } catch (error) {
            const friendlyMessage = translateFirebaseError(error.code);
            toast.error(`${friendlyMessage}`);
            console.error('更新失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="edit-form-container" id="edit-dog-form">
            <form onSubmit={handleSubmit} className="edit-form">
                <h2 className="edit-form-title">✏️ 編輯通報資訊</h2>

                <button
                    type="button"
                    className="btn-found"
                    onClick={handleMarkAsFound}
                    disabled={loading}
                >
                    ✓ 標記為已尋獲
                </button>

                {/* 圖片上傳 */}
                <div className="edit-form-group">
                    <label className="edit-form-label">
                        照片 ({totalImages}/3)
                    </label>

                    {existingImages.length > 0 && (
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.625rem' }}>
                                現有照片：
                            </p>
                            <div className="edit-form-previews">
                                {existingImages.map((url, index) => (
                                    <div key={`existing-${index}`} className="edit-form-preview-item">
                                        <img 
                                            src={url} 
                                            alt={`現有照片 ${index + 1}`} 
                                            className="edit-form-preview" 
                                            loading="lazy"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(index)}
                                            className="edit-form-remove-btn"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {newImagePreviews.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.625rem' }}>
                                新增照片：
                            </p>
                            <div className="edit-form-previews">
                                {newImagePreviews.map((preview, index) => (
                                    <div key={`new-${index}`} className="edit-form-preview-item">
                                        <img 
                                            src={preview} 
                                            alt={`新增照片 ${index + 1}`} 
                                            className="edit-form-preview"
                                            loading="lazy" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeNewImage(index)}
                                            className="edit-form-remove-btn"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {totalImages < 3 && (
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageChange}
                            className="edit-form-file-input"
                            style={{ marginTop: '1rem' }}
                        />
                    )}
                </div>

                {/* 基本資料 */}
                <div className="edit-form-row">
                    <div className="edit-form-group">
                        <label className="edit-form-label">名字</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="例：小白"
                            className="edit-form-input"
                        />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-form-label">品種</label>
                        <input
                            type="text"
                            name="breed"
                            value={formData.breed}
                            onChange={handleChange}
                            placeholder="例：柴犬"
                            className="edit-form-input"
                        />
                    </div>
                </div>

                <div className="edit-form-row">
                    <div className="edit-form-group">
                        <label className="edit-form-label">毛色</label>
                        <input
                            type="text"
                            name="color"
                            value={formData.color}
                            onChange={handleChange}
                            placeholder="例：白色"
                            className="edit-form-input"
                        />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-form-label">年齡</label>
                        <input
                            type="text"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            placeholder="例：3歲"
                            className="edit-form-input"
                        />
                    </div>
                </div>

                {/* 性別 + 項圈 */}
                <div className="edit-form-row">
                    <div className="edit-form-group">
                        <label className="edit-form-label">性別</label>
                        <div className="edit-form-radio-group">
                            <label className="edit-form-radio-label">
                                <input
                                    type="radio"
                                    name="gender"
                                    value="公"
                                    checked={formData.gender === '公'}
                                    onChange={handleChange}
                                />
                                公
                            </label>
                            <label className="edit-form-radio-label">
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

                    <div className="edit-form-group">
                        <label className="edit-form-label">有無配戴項圈</label>
                        <div className="edit-form-radio-group">
                            <label className="edit-form-radio-label">
                                <input
                                    type="radio"
                                    name="collar"
                                    value="有項圈"
                                    checked={formData.collar === '有項圈'}
                                    onChange={handleChange}
                                />
                                有項圈
                            </label>
                            <label className="edit-form-radio-label">
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
                <div className="edit-form-row">
                    <div className="edit-form-group">
                        <label className="edit-form-label">走失地點</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="例：臺北市大安區"
                            className="edit-form-input"
                        />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-form-label">走失日期</label>
                        <input
                            type="date"
                            name="lostDate"
                            value={formData.lostDate}
                            onChange={handleChange}
                            className="edit-form-input"
                            max={today}
                        />
                    </div>
                </div>

                {/* 聯絡資訊 */}
                <div className="edit-form-row">
                    <div className="edit-form-group">
                        <label className="edit-form-label">聯絡人</label>
                        <input
                            type="text"
                            name="contactName"
                            value={formData.contactName}
                            onChange={handleChange}
                            placeholder="您的名字"
                            className="edit-form-input"
                        />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-form-label">聯絡電話</label>
                        <input
                            type="tel"
                            name="contactPhone"
                            value={formData.contactPhone}
                            onChange={handleChange}
                            placeholder="0912345678"
                            className="edit-form-input"
                        />
                    </div>
                </div>

                {/* 詳細描述 */}
                <div className="edit-form-group">
                    <label className="edit-form-label">詳細描述（最多 100 字）</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="例：脖子有戴紅色項圈，個性活潑親人..."
                        rows="4"
                        className="edit-form-textarea"
                    />
                    <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                        {formData.description.length} / 100
                    </div>
                </div>

                {error && <div className="edit-form-error">{error}</div>}

                {/* 送出按鈕 */}
                <div className="edit-form-actions">
                    <button 
                        type="submit" 
                        className="btn-save"
                        disabled={loading}
                    >
                        {loading ? '更新中...' : '儲存修改'}
                    </button>

                    <button 
                        type="button" 
                        className="btn-cancel"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        取消
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditDogForm;