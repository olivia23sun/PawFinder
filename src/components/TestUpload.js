// src/components/TestUpload.jsx
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

function TestUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('請先選擇圖片！');
      return;
    }

    try {
      setUploading(true);
      
      // 建立檔案參考（路徑）
      const storageRef = ref(storage, `test/${file.name}`);
      
      // 上傳檔案
      await uploadBytes(storageRef, file);
      console.log('✅ 上傳成功！');
      
      // 取得下載網址
      const url = await getDownloadURL(storageRef);
      console.log('📷 圖片網址：', url);
      setImageUrl(url);
      
      alert('上傳成功！');
      
    } catch (error) {
      console.error('❌ 上傳失敗：', error);
      alert('上傳失敗：' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', margin: '20px' }}>
      <h3>🧪 測試圖片上傳</h3>
      
      <input 
        type="file" 
        accept="image/*"
        onChange={handleFileChange}
        style={{ marginBottom: '10px' }}
      />
      
      <button 
        onClick={handleUpload}
        disabled={uploading || !file}
        style={{
          padding: '10px 20px',
          backgroundColor: uploading ? '#ccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: uploading ? 'not-allowed' : 'pointer'
        }}
      >
        {uploading ? '上傳中...' : '上傳圖片'}
      </button>
      
      {imageUrl && (
        <div style={{ marginTop: '20px' }}>
          <p>✅ 上傳成功！圖片網址：</p>
          <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>{imageUrl}</p>
          <img 
            src={imageUrl} 
            alt="上傳的圖片" 
            style={{ maxWidth: '300px', marginTop: '10px' }}
          />
        </div>
      )}
    </div>
  );
}

export default TestUpload;