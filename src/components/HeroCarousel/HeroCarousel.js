import Carousel from 'react-bootstrap/Carousel';

const HeroCarousel = () => {
    return (
        <div style={{ marginTop: '70px' }}>
            <Carousel>
                <Carousel.Item>
                    <div style={{
                        height: '400px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '3rem'
                    }}>
                        <img 
                        src="/assets/1.jpg" 
                        alt="第一張"
                        style={{
                            width: '100%',
                            height: '400px',
                            objectFit: 'cover'
                        }}
                        />
                    </div>
                </Carousel.Item>
                
                <Carousel.Item>
                    <div style={{
                        height: '400px',
                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '3rem'
                    }}>
                        <img 
                        src="/assets/2.jpg" 
                        alt="第二張"
                        style={{
                            width: '100%',
                            height: '400px',
                            objectFit: 'cover'
                        }}
                        />
                    </div>
                </Carousel.Item>
                
                <Carousel.Item>
                    <div style={{
                        height: '400px',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '3rem'
                    }}>
                        <img 
                        src="/assets/3.jpg" 
                        alt="第三張"
                        style={{
                            width: '100%',
                            height: '400px',
                            objectFit: 'cover'
                        }}
                        />
                    </div>
                </Carousel.Item>
            </Carousel>
        </div>
    );
}

export default HeroCarousel;