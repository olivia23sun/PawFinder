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

            toast.success('✅ 已標記為尋獲！');
            onComplete();
        } catch (error) {
            const friendlyMessage = translateFirebaseError(error.code);
            toast.error(`發布失敗：${friendlyMessage}`);
            console.error('❌ 標記失敗:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError('');

        if (!formData.name.trim()) {
            setError('❌ 請輸入毛孩名字');
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

            <div className="edit-form-group">
                <label className="edit-form-label">
                    毛孩照片 ({totalImages}/3)
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

\                {totalImages < 3 && (
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

            <div className="edit-form-row">
                <div className="edit-form-group">
                    <label className="edit-form-label">名字</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
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

            <div className="edit-form-row">
                <div className="edit-form-group">
                    <label className="edit-form-label">性別</label>
                    <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="edit-form-select"
                    >
                        <option value="">請選擇</option>
                        <option value="公">公</option>
                        <option value="母">母</option>
                    </select>
                </div>

                <div className="edit-form-group">
                    <label className="edit-form-label">走失地點</label>
                    <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        required
                        className="edit-form-input"
                    />
                </div>
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

            <div className="edit-form-row">
                <div className="edit-form-group">
                    <label className="edit-form-label">聯絡人姓名</label>
                    <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
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
                        className="edit-form-input"
                    />
                </div>
            </div>

            <div className="edit-form-group">
                <label className="edit-form-label">詳細描述</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    placeholder="請描述狗狗的特徵、習性等..."
                    className="edit-form-textarea"
                />
            </div>

            {error && <div className="edit-form-error">{error}</div>}

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
