import "./DogCard.css";
import { useState } from "react";
import ContactModal from '../ContactModal/ContactModal';

const DogCard = ({dog, onEdit, onDelete, currentUserId}) => {
    
    const [showContactModal, setShowContactModal] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const images = dog.imageUrls;
    const isOwner = currentUserId && dog.userId === currentUserId;

    const nextImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = (e) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

      // 計算走失天數
    const getDaysLost = () => {
    if (!dog.createdAt) return null;
    const now = new Date();
    const lostDate = dog.createdAt.toDate();
    const days = Math.floor((now - lostDate) / (1000 * 60 * 60 * 24));
    return days;
    };

    const daysLost = getDaysLost();

    return(
        <>
                <div className="dog-card">
                {/* ✅ 已尋獲遮罩 */}
                {dog.status === 'found' && (
                    <div className="found-overlay">
                        <div className="found-badge">
                            已尋獲
                        </div>
                    </div>
                )}

                <div className="card-image-wrapper">
                    <img 
                        src={images[currentImageIndex]} 
                        alt={dog.name} 
                        className="card-image"
                    />
                    
                    {images.length > 1 && (
                        <>
                            <button 
                                className="carousel-btn carousel-btn-prev" 
                                onClick={prevImage}
                            >
                                ‹
                            </button>
                            <button 
                                className="carousel-btn carousel-btn-next" 
                                onClick={nextImage}
                            >
                                ›
                            </button>
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
                        {/* 走失天數標籤 */}
                {daysLost !== null && (
                <div className="dog-card-days-badge">
                    走失 {daysLost} 天
                </div>
                )}
                
                <div className="card-content">
                        <h3 className="card-title">{dog.name}</h3>
                        <div className="card-info">
                            <div className="info-item">
                                📍 {dog.location}
                            </div>
                            <div className="info-item">
                                <span className={`badge ${(dog.gender==="公") ? 'boy-gender' : 'girl-gender'}`}>{dog.gender}</span>    

                                <span className={`badge ${dog.collar ? 'badge-collar' : 'badge-no-collar'}`}>{dog.collar ? '有項圈' : '無項圈'}</span>
                            </div>
                            <div className="info-item">
                                💬 {dog.description}
                            </div>
                        </div>
                    </div>
                    <div className="card-footer">
                        {dog.createdAt && (<span className="date">通報時間：{dog.createdAt.toDate().toLocaleDateString('zh-TW')}</span>)}
                        <a href="#contact" className="contact-btn" onClick={() => setShowContactModal(true)}>聯繫飼主</a>
                    </div>
                    
                {isOwner && (
                    <div className="card-actions">
                        <button 
                            className="btn-edit"
                            onClick={() => onEdit(dog)}
                        >
                            ✏️ 編輯
                        </button>
                        <button 
                            className="btn-delete"
                            onClick={() => onDelete(dog.id)}
                        >
                            🗑️ 刪除
                        </button>
                    </div>
                )}                   
                </div>
                
                
                {showContactModal && (
                <ContactModal 
                    dog={dog}
                    onClose={() => setShowContactModal(false)}
                />
                )}
    </>

    );
}

export default DogCard;