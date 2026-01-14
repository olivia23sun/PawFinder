import './ContactModal.css';
import toast from 'react-hot-toast';

const ContactModal = ({ dog, onClose }) => {
    if (!dog) return null;

    // ========== 複製到剪貼簿 ==========
    const handleCopyToClipboard = async (text) => {
        await navigator.clipboard.writeText(text);
        toast.success('已複製到剪貼簿！');
    };

    // ========== 撥打電話 ==========
    const handleCall = () => {
        window.location.href = `tel:${dog.contactPhone}`;
    };

    return (
        // 點擊遮罩關閉 Modal
        <div className="modal-overlay" onClick={onClose}>
            {/* 點擊內容不關閉 Modal */}
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                
                <h2>聯繫飼主</h2>

                {/* 狗狗資訊 */}
                <div className="dog-info-header">
                    <img src={dog.imageUrls} alt={dog.name} />
                    <div>
                        <h3>{dog.name}</h3>
                        <p>📍 {dog.location}</p>
                    </div>
                </div>

                {/* 聯絡資訊 */}
                <div className="contact-section">
                    {dog.contactName && (
                        <div className="contact-item">
                            <label>飼主資訊</label>
                            <span className="contact-value">{dog.contactName}</span>
                        </div>
                    )}
                    
                    {dog.contactPhone && (
                        <div className="contact-item">
                            <label>聯絡電話</label>
                            <div className="contact-actions">
                                <span className="contact-value">{dog.contactPhone}</span>
                                <button onClick={handleCall} className="btn-call">
                                    撥打電話
                                </button>
                                <button 
                                    onClick={() => handleCopyToClipboard(dog.contactPhone)} 
                                    className="btn-copy"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 安全提醒 */}
                <div className="warning-box">
                    <p>－ 溫馨提醒 －</p>
                    <ul>
                        <p>請確認對方身份後再提供狗狗資訊</p>
                        <p>注意自身安全，建議在公開場所見面</p>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ContactModal;