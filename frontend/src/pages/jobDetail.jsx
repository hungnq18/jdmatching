import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../context/api/api";
import axiosClient from "../context/api/axiosClient";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 10;

  useEffect(() => {
    if (!id) return;

    const fetchJob = async () => {
      try {
        const res = await axiosClient.get(API.JOBS.DETAIL(id));
        setJob(res.data);
      } catch (err) {
        console.error("Lỗi khi lấy job:", err);
      } finally {
        setLoadingJob(false);
      }
    };

    const fetchCandidates = async () => {
      try {
        const res = await axiosClient.get(API.CANDIDATES.LIST(id));
        setCandidates(res.data.matchedUsers || []);
      } catch (err) {
        console.error("Lỗi khi lấy ứng viên:", err);
      } finally {
        setLoadingCandidates(false);
      }
    };

    fetchJob();
    fetchCandidates();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  // Pagination logic
  const indexOfLast = currentPage * candidatesPerPage;
  const indexOfFirst = indexOfLast - candidatesPerPage;
  const currentCandidates = candidates.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(candidates.length / candidatesPerPage);

  if (loadingJob)
    return <p className="text-center text-blue-500">Đang tải chi tiết job...</p>;
  if (!job) return <p className="text-center text-red-500">Không tìm thấy job</p>;

  const jobFields = [
    { label: "Tiêu đề", value: job.title },
    { label: "Tên công ty", value: job.company_name },
    { label: "Website", value: job.company_website },
    { label: "Địa điểm", value: job.location },
    { label: "Visa", value: job.visa_type },
    { label: "Ngành nghề", value: job.industry },
    { label: "Tên công việc", value: job.job_name },
    { label: "Mô tả công việc", value: job.job_description },
    { label: "Số lượng cần tuyển", value: job.recruitment_number_needed },
    { label: "Giới tính", value: job.gender },
    { label: "Độ tuổi", value: job.age_range },
    { label: "Trình độ", value: job.education },
    { label: "Kỹ năng yêu cầu", value: job.skills_required },
    { label: "Ngày phỏng vấn", value: formatDate(job.interview_date) },
    { label: "Ngày nhập cảnh", value: job.entry_date },
    { label: "Thời hạn HĐ", value: job.contract_duration },
    { label: "Lương tháng", value: job.monthly_salary },
    { label: "Tổng lương dự kiến", value: job.total_expected_salary },
    { label: "Thông tin KTX", value: job.dormitory_info },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg shadow-sm text-gray-700 transition"
      >
        ⬅ Quay lại
      </button>

      {/* Job Info */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          📋 Chi tiết Job
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {jobFields.map((field, idx) => (
            <div
              key={idx}
              className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              <p className="text-xs text-gray-500 uppercase">{field.label}</p>
              <p className="text-gray-800 font-medium mt-1">
                {field.value || <span className="italic text-gray-400">Chưa có</span>}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Candidate List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          👤 Ứng viên phù hợp
        </h3>
        {loadingCandidates ? (
          <p className="text-center text-blue-500">
            Đang tải danh sách ứng viên...
          </p>
        ) : currentCandidates.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-50 text-gray-700">
                    <th className="p-3 border">Họ tên</th>
                    <th className="p-3 border">Giới tính</th>
                    <th className="p-3 border">Ngày sinh</th>
                    <th className="p-3 border">CMT/CCCD</th>
                    <th className="p-3 border">Email</th>
                    <th className="p-3 border">Ngành nghề</th>
                    <th className="p-3 border">Mạng xã hội</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCandidates.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="p-3 border font-medium text-gray-800">
                        {user.fullName}
                      </td>
                      <td className="p-3 border">{user.gender}</td>
                      <td className="p-3 border">{user.birthDate}</td>
                      <td className="p-3 border">{user.idNumber}</td>
                      <td className="p-3 border">{user.email}</td>
                      <td className="p-3 border">
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                          {user.jobTitle}
                        </span>
                      </td>
                      <td className="p-3 border">{user.socialNetwork}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex justify-center mt-6 space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={`px-3 py-1 rounded-lg shadow-sm transition ${
                  currentPage === 1
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                ⬅ Trước
              </button>
              <span className="px-3 py-1 text-gray-700">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className={`px-3 py-1 rounded-lg shadow-sm transition ${
                  currentPage === totalPages
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                Sau ➡
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500 italic">Không có ứng viên phù hợp</p>
        )}
      </div>
    </div>
  );
};

export default JobDetail;
