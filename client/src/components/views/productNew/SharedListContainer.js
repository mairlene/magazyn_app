import React from 'react';
import ItemGrid from '../../product/ItemGrid';
import Pagination from '../pagination';

export default function SharedListContainer({ topBar, items = [], totalCount = 0, viewMode = 'list', toggleViewMode = () => {}, onEdit = () => {}, onDelete = () => {}, totalPages = 1, currentPage = 1, setPage = () => {} }) {
  return (
    <>
      {/* topBar (e.g. ProductForm when editing) */}
      {topBar ? <div className="mb-4">{topBar}</div> : null}

      {/* Use ItemGrid which supports both grid and list rendering via viewMode */}
      <div>
        <ItemGrid products={items} viewMode={viewMode} mode={'productNew'} onEdit={(p) => onEdit(p)} onDelete={(p) => onDelete(p)} />
      </div>

      <div className="mt-4 flex justify-end">
        <Pagination totalPages={totalPages} currentPage={currentPage} onChangePage={setPage} />
      </div>
    </>
  );
}
