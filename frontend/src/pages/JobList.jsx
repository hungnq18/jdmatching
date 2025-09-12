import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "../context/JobContext";

const JobList = () => {
  const { jobs, loading, error, fetchJobs, deleteJob } = useJobs();
  const navigate = useNavigate();

  // --- Pagination state ---
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 12;

  if (loading) return <p className="text-center text-blue-500">⏳ Đang tải danh sách job...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  const goToDetail = (id) => {
    navigate(`/jobs/${id}`);
  };

  // --- Pagination logic ---
  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const currentJobs = jobs.slice(startIndex, startIndex + jobsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">💼 Danh sách việc làm</h2>
        <button
          onClick={fetchJobs}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition"
        >
          🔄 Tải lại
        </button>
      </div>

      <p className="text-gray-600 mb-4">
        Trang {currentPage}/{totalPages} — Tổng: <b>{jobs.length}</b> job
      </p>

      {jobs.length > 0 ? (
        <>
          {/* --- Card layout --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentJobs.map((job) => (
              <div
                key={job._id}
                onClick={() => goToDetail(job._id)}
                className="bg-white rounded-xl shadow-md p-5 border hover:shadow-lg transition cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-semibold text-gray-800">{job.title}</h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteJob(job._id);
                    }}
                    className="text-sm px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-sm"
                  >
                    Xóa
                  </button>
                </div>
                <p className="mt-2 text-gray-600 text-sm">{job.job_description || "Không có mô tả"}</p>

                <div className="mt-3">
                  <p className="text-sm text-gray-700">
                    <b>Công ty:</b> {job.company_name || "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <b>Địa điểm:</b> {job.location || "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <b>Lương giờ:</b> {job.hourly_wage || "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <b>Tổng lương dự kiến:</b> {job.total_expected_salary || "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <b>Ngày phỏng vấn:</b> {formatDate(job.interview_date) ||job.interview_date||  "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <b>Ngày nhập cảnh:</b> {job.entry_date || "—"}
                  </p>
                  <p className="text-sm text-gray-700"> 
                    <b>Thời hạn hợp đồng:</b> {job.contract_duration || "—"}
                  </p>
                  <p className="text-sm text-gray-700">
                    <b>Ngôn ngữ:</b> {job.special_requirements?.find(req => req.includes("Tiếng Nhật")) || "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* --- Pagination controls --- */}
          <div className="flex justify-center mt-8 space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${currentPage === 1
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
            >
              ⬅ Trước
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`px-4 py-2 rounded-lg ${currentPage === i + 1
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                  }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg ${currentPage === totalPages
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gray-200 hover:bg-gray-300"
                }`}
            >
              Sau ➡
            </button>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-500">🚫 Chưa có job nào</p>
      )}
    </div>
  );
};

export default JobList;