import './DogCard.css';
import DOG_STATUS from '../../constants/status';
import { useState } from 'react';
import ContactModal from '../ContactModal/ContactModal';

const DogCard = ({ dog, onEdit, onDelete, currentUserId }) => {
    const [showContactModal, setShowContactModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // ========== 防呆處理：確保 imageUrls 是陣列 ==========
    const images = dog.imageUrls || [];
    
    // ========== 權限判斷：是否為發布者 ==========
    const isOwner = currentUserId && dog.userId === currentUserId;

    // ========== 圖片輪播：下一張 ==========
    const handleNextImage = (e) => {
        e.stopPropagation();  // 防止觸發卡片點擊事件
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    // ========== 圖片輪播：上一張 ==========
    const handlePrevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // ========== 計算走失天數 ==========
    const getDaysLost = () => {
        if (!dog.createdAt) return null;
        const now = new Date();
        const lostDate = new Date(dog.lostDate);
        const days = Math.floor((now - lostDate) / (1000 * 60 * 60 * 24));
        return days;
    };

    const daysLost = getDaysLost();

    return (
        <>
            <div className="dog-card">
                {/* ========== 已尋獲遮罩 ========== */}
                {dog.status === DOG_STATUS.FOUND && (
                    <div className="found-overlay">
                        <div className="found-badge">
                            已尋獲
                        </div>
                    </div>
                )}

                {/* ========== 圖片輪播區 ========== */}
                <div className="card-image-wrapper">
                    <img 
                        onClick={() => window.open(images[currentImageIndex], '_blank')}
                        src={images[currentImageIndex]} 
                        alt={dog.name}
                        className="card-image"
                        loading="lazy"
                        title="點擊放大寵物44444照片"
                    />
                    
                    {/* 多張圖片時顯示左右切換按鈕 */}
                    {images.length > 1 && (
                        <>
                            <button 
                                className="carousel-btn carousel-btn-prev" 
                                onClick={handlePrevImage}
                                aria-label="上一張照片"
                            >
                                ‹
                            </button>
                            <button 
                                className="carousel-btn carousel-btn-next" 
                                onClick={handleNextImage}
                                aria-label="下一張照片"
                            >
                                ›
                            </button>
                            
                            {/* 圖片指示器 */}
                            <div className="carousel-indicators">
                                {images.map((_, index) => (
                                    <span 
                                        key={index}
                                        className={`indicator ${index === currentImageIndex ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentImageIndex(index);
                                        }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ========== 走失天數標籤 ========== */}
                {daysLost !== null && (
                    <div className="dog-card-days-badge">
                        走失 {daysLost} 天
                    </div>
                )}
                
                {/* ========== 卡片內容 ========== */}
                <div className="card-content">
                    <h3 className="card-title">{dog.name}</h3>
                    <div className="card-info">
                        <div className="info-item">
                            📍 {dog.location}
                        </div>
                        <div className="info-item">
                            <span className={`badge ${dog.gender === '公' ? 'boy-gender' : 'girl-gender'}`}>
                                {dog.gender}
                            </span>
                            <span className={`badge ${dog.collar ? 'badge-collar' : 'badge-no-collar'}`}>
                                {dog.collar ? '有項圈' : '無項圈'}
                            </span>
                        </div>
                        <div className="info-item">
                            💬 {dog.description}
                        </div>
                    </div>
                </div>
 
                {/* ========== 卡片底部 ========== */}
                <div className="card-footer">
                    {dog.createdAt && (
                        <span className="date">
                            通報時間：{dog.createdAt.toDate().toLocaleDateString('zh-TW')}
                        </span>
                    )}
                    <a 
                        href="#contact" 
                        className="contact-btn" 
                        onClick={() => setShowContactModal(true)}
                    >
                        聯繫飼主
                    </a>
                </div>

                {/* ========== 編輯/刪除按鈕（只有發布者看得到）========== */}
                {isOwner && (
                    <div className="card-actions">
                        <button 
                            className="btn-edit"
                            onClick={() => onEdit(dog)}
                        >
                            編輯
                        </button>
                        <button 
                            className="btn-delete"
                            onClick={() => onDelete(dog.id, dog.userId)}
                        >
                            刪除
                        </button>
                    </div>
                )}
            </div>
            
            {/* ========== 聯絡 Modal ========== */}
            {showContactModal && (
                <ContactModal 
                    dog={dog}
                    onClose={() => setShowContactModal(false)}
                />
            )}
        </>
    );
};

export default DogCard;