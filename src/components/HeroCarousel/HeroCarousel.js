import Carousel from 'react-bootstrap/Carousel';
import './HeroCarousel.css';

const HeroCarousel = () => {
    return (
        <div className="hero-carousel-wrapper">
            <Carousel>
                <Carousel.Item>
                    <div className="carousel-slide">
                        <img 
                            src="/assets/banner-dog.jpg" 
                            alt="第一張"
                            className="carousel-image"
                        />
                    </div>
                </Carousel.Item>
                
                <Carousel.Item>
                    <div className="carousel-slide">
                        <img 
                            src="/assets/banner-cat.jpg" 
                            alt="第二張"
                            className="carousel-image"
                        />
                    </div>
                </Carousel.Item>
                
                <Carousel.Item>
                    <div className="carousel-slide">
                        <img 
                            src="/assets/banner-mouse.jpg" 
                            alt="第三張"
                            className="carousel-image"
                        />
                    </div>
                </Carousel.Item>
            </Carousel>
        </div>
    );
}

export default HeroCarousel;