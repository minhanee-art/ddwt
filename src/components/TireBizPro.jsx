import React, { useState } from 'react';
import ShopLayout from './ShopLayout';
import ProductList from './ProductList';

const TireBizPro = () => {
    return (
        <ShopLayout title="실시간 재고 조회">
            <ProductList />
        </ShopLayout>
    );
};

export default TireBizPro;

