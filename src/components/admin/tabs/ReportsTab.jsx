// src/pages/Admin/tabs/ReportsTab.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { regionData } from '@/utils/regionData';
import '@/styles/AdminPage.css';

export default function ReportsTab() {
  // 필터 상태
  const [type, setType] = useState('ALL'); // ALL | LOST | TIP | REPORTED
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [keyword, setKeyword] = useState('');

  // 페이지네이션
  const [page, setPage] = useState(1); // 1-based
  const [limit, setLimit] = useState(10);

  // 데이터 상태
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1, totalItems: 0 });

  // 로딩/에러
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const totalPages = meta?.totalPages ?? 1;
  const currentPage = meta?.currentPage ?? page;

  const pageNumbers = useMemo(() => {
    const maxVisible = 10;
    let startPage = Math.max(currentPage - Math.floor(maxVisible / 2), 1);
    let endPage = startPage + maxVisible - 1;
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - maxVisible + 1, 1);
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [currentPage, totalPages]);

  const resetPage = () => setPage(1);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // ReportMain의 쿼리 구성 방식을 따름 (page는 0-based) :contentReference[oaicite:2]{index=2}
      const params = new URLSearchParams();
      if (type !== 'ALL') params.append('type', type);
      if (region) params.append('region', region);
      if (district) params.append('district', district);
      if (keyword) params.append('keyword', keyword);
      params.append('page', Math.max(page - 1, 0));
      params.append('limit', limit);

      // 동일 엔드포인트 사용 (공용 목록 + 필터) :contentReference[oaicite:3]{index=3}
      const res = await axios.get(`/api/lost-pet/paged?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      });

      // 다양한 응답 포맷 대응(ReportMain과 동일 로직) :contentReference[oaicite:4]{index=4}
      const dataList = res.data?.data ?? res.data?.content ?? res.data ?? [];
      const metaData =
        res.data?.pagination?.meta ??
        res.data?.meta ??
        {
          totalPages: Math.max(Math.ceil((res.data?.total ?? dataList.length) / limit), 1),
          currentPage: page,
          totalItems: res.data?.total ?? dataList.length,
        };

      setRows(dataList);
      setMeta(metaData);
    } catch (e) {
      console.error(e);
      setError('신고/제보 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // 관리자 조치 API (기존 ReportsTab 패턴을 유지) :contentReference[oaicite:5]{index=5}
  const moderate = async (postId, action) => {
    try {
      await axios.patch(`/api/admin/posts/${postId}/moderate`, { action }); // HIDE | DELETE | WARN
      alert('처리되었습니다.');
      fetchReports();
    } catch (e) {
      alert('처리 실패');
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '-';
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return String(dt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleDelete = async (id) => {
  if (!window.confirm('정말로 삭제하시겠습니까?')) return;
  const token = localStorage.getItem('accessToken');
  try {
    await axios.delete(`/api/lost-pet/${id}`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
    });
    alert('삭제되었습니다.');
    fetchReports(); // 목록 새로고침
  } catch (err) {
    console.error(err);
    const code = err?.response?.status;
    if (code === 403) alert('삭제 권한이 없습니다.');
    else if (code === 401) alert('로그인이 필요합니다.');
    else alert('삭제 중 오류가 발생했습니다.');
  }
};


  return (
    <section>
      <h3>신고·제보 관리</h3>

      <form
        className="admin-filter-row"
        style={{ gap: '0.5rem' }}
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          fetchReports();
        }}
      >
        {/* <select value={type} onChange={(e) => { setType(e.target.value); resetPage(); }}>
                <option value="ALL">전체 유형</option>
                <option value="LOST">분실신고</option>
                <option value="TIP">제보</option>
              </select> */}

        {/* region 선택 시 district 초기화 패턴 유지 */}
        <select
          value={region}
          onChange={(e) => { setRegion(e.target.value); setDistrict(''); }}
        >
          <option value="">행정구역</option>
          {Object.keys(regionData).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          disabled={!region || !regionData[region] || regionData[region].length === 0}
        >
          <option value="">시/군/구</option>
          {regionData[region]?.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* (변경) 엔터로 곧바로 submit */}
        <input
          type="text"
          placeholder="키워드"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ minWidth: 180 }}
        />

        {/* (변경) 검색 버튼은 submit */}
        <button 
          type="submit"
          className="admin-btn admin-btn-primary"
        >
          검색
        </button>
      </form>
      

      {/* 상태 */}
      <div style={{ marginBottom: '0.75rem' }}>
        <span>전체 <strong>{meta?.totalItems ?? rows.length}</strong> 건</span>
      </div>

      {loading && <p>불러오는 중...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && rows.length === 0 && <p>데이터가 없습니다.</p>}

      {/* 목록 */}
      {!loading && !error && rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>ID</th>
                <th style={{ width: 120 }}>작성자</th>
                <th style={{ width: 140 }}>지역</th>
                <th style={{ width: 110 }}>작성일</th>
                <th style={{ width: 210 }}>처리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id}>
                  <td>{it.id}</td>
                  <td>{it.nickName || it.authorNickname || it.nickname || it.author || it.userid || '-'}</td>
                  <td>
                    {it.placeLost
                      ? it.placeLost
                      : (it.region || '-') + (it.district ? ` / ${it.district}` : '')}
                  </td>
                  <td>{formatDate(it.createdAt || it.dateCreated)}</td>
                  <td className="table-actions" style={{gap: '0'}}>
                    <button 
                      className="custom-btn btn-3" 
                      onClick={() => window.open(`/report/view?id=${it.id}`, '_blank')}
                      style={{ marginRight: '0.5rem' }}
                    >
                      신고글 보기
                    </button>
                    <button className="custom-btn btn-4" onClick={() => handleDelete(it.id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이지네이션 */}
          <div className="pagination" style={{ marginTop: '1rem' }}>
            <button className="page-btn" onClick={() => setPage(1)} disabled={page === 1}>처음</button>
            <button className="page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>이전</button>

            {pageNumbers.map((p) => (
              <button
                key={p}
                className={`page-btn ${page === p ? 'page-btn--active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button className="page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>다음</button>
            <button className="page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>끝</button>
          </div>
        </div>
      )}
    </section>
  );
}
