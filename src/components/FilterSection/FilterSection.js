import { useState } from "react";
import "./FilterSection.css" ;
import TAIWAN_CITIES from "../../constants/taiwanCities";

const FilterSection=({ onFilterChange }) => {
    const [filters, setFilters] = useState({
        region: '',
        gender:'',
        collar: '',
        date: '',
        search: ''
    });

    // 處理篩選條件變更
    const handleFilterChange = (field, value) => {
        const newFilters = {
            ...filters,
            [field]: value
        };
        
        setFilters(newFilters);
        
        // 通知父組件篩選條件已改變
        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    // 重置所有篩選
    const handleReset = () => {
        const resetFilters = {
            region: '',
            collar: '',
            date: '',
            search: ''
        };
        
        setFilters(resetFilters);
        
        if (onFilterChange) {
            onFilterChange(resetFilters);
        }
    };

    return( 
        <div className="container">     
            <section className="filter-section">
                <h2 className="filter-title">🔍 搜尋走失毛孩</h2>
                    <div className="filters">
                        <div className="filter-group">
                            <label for="region">地區</label>
                                <select 
                                    id="region"
                                    value={filters.region}
                                    onChange={(e) => handleFilterChange('region', e.target.value)}
                                >
                                <option value="">全部地區</option>
                                {TAIWAN_CITIES.map((city) => (
                                <option 
                                    key={city.value} // 🚨 非常重要：在 React 列表渲染中必須有唯一的 key
                                    value={city.value}
                                >
                                {city.label}
                                </option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label for="gender">性別</label>
                                <select 
                                    id="gender"
                                    value={filters.gender}
                                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                                >
                                <option value="">全部</option>
                                <option value="boy">男生</option>
                                <option value="girl">女生</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label for="collar">項圈</label>
                                <select 
                                    id="collar"
                                    value={filters.collar}
                                    onChange={(e) => handleFilterChange('collar', e.target.value)}
                                >
                                <option value="">全部</option>
                                <option value="yes">有項圈</option>
                                <option value="no">無項圈</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label for="date">走失時間</label>
                                <select 
                                    id="date"
                                    value={filters.date}
                                    onChange={(e) => handleFilterChange('date', e.target.value)}
                                >
                                <option value="">全部時間</option>
                                <option value="today">今天</option>
                                <option value="week">一週內</option>
                                <option value="month">一個月內</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label for="search">搜尋關鍵字</label>
                            <input 
                                type="text" 
                                id="search" 
                                placeholder="狗名或特徵..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                            />
                        </div>
                        <div className="filter-group">

                        </div>
                        <button 
                                className="reset-btn"
                                onClick={handleReset}
                            >
                                🔄 重置篩選
                        </button>
                    </div>
            </section>
        </div> 
        );
}

export default FilterSection ;