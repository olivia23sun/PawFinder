import './ContactModal.css';

function ContactModal({ dog, onClose }) {
    if (!dog) return null;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('✅ 已複製到剪貼簿！');
    };

    const handleCall = () => {
        window.location.href = `tel:${dog.contactPhone}`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                
                <h2>聯繫飼主</h2>
                <div className="dog-info-header">
                    <img src={dog.imageUrl} alt={dog.name} />
                    <div>
                        <h3>{dog.name}</h3>
                        <p>📍 {dog.location}</p>
                    </div>
                </div>

                <div className="contact-section">

                    {dog.contactName && (
                        <div className="contact-item">
                            <label>飼主資訊</label>
                            <span className="contact-value">{dog.contactName}</span>
                        </div>
                    )}
                    {dog.contactPhone && (
                        <div className="contact-item">
                            <label>📞 聯絡電話</label>
                            <div className="contact-actions">
                                <span className="contact-value">{dog.contactPhone}</span>
                                <button onClick={handleCall} className="btn-call">
                                    撥打電話
                                </button>
                                <button 
                                    onClick={() => copyToClipboard(dog.contactPhone)} 
                                    className="btn-copy"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="warning-box">
                    <p>⚠️ 溫馨提醒</p>
                    <ul>
                        <li>請確認對方身份後再提供狗狗資訊</li>
                        <li>建議在公開場所見面</li>
                        <li>注意自身安全</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default ContactModal;