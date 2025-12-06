import React, { useCallback, useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileText, FileSpreadsheet, Search, Printer } from 'lucide-react';

const formatNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '0';

const formatProgramLabel = (course = {}) => {
  return [course.course_code ?? course.code, course.course_name ?? course.name]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .join(' · ');
};

const formatSummaryTotals = (entries) =>
  entries.reduce((acc, [, total]) => acc + (Number(total) || 0), 0);

const loadLogoImage = () => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/images/buksu_logo.png';
  });
};

export default function EnrollmentReport() {
  const { totals = {}, statusSummary = [], byCourse = [], bySchoolYear = [], recentEnrollments = [], auth, activeEnrollmentPeriod } = usePage().props;
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const administratorName = useMemo(() => {
    const user = auth?.user;
    if (!user) return null;
    return [user.fName, user.mName, user.lName]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(' ');
  }, [auth?.user]);

  const summary = useMemo(() => {
    const byStatus = statusSummary.reduce((acc, item) => {
      if (!item?.status) return acc;
      acc[item.status.toLowerCase()] = item.count ?? 0;
      return acc;
    }, {});

    const byYear = bySchoolYear.map((entry) => ({
      year_level: entry.school_year ?? 'Unassigned',
      total: entry.total ?? 0,
    }));

    const byProgram = byCourse.map((course) => ({
      program: formatProgramLabel(course) || 'Program',
      total: course.total ?? 0,
    }));

    return {
      total: totals.total ?? 0,
      programs: byProgram.length,
      by_status: byStatus,
      by_year: byYear,
      by_program: byProgram,
      program_breakdown: [],
      grand_totals: {
        male: 0,
        female: 0,
        overall: totals.total ?? 0,
      },
      meta: {
        campus: 'University Wide',
        semester: 'All',
        school_year: 'All',
        prepared_by: administratorName ?? 'Administrator',
        prepared_role: auth?.user?.role ? auth.user.role.replace('_', ' ') : 'Administrator',
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      },
    };
  }, [auth?.user?.role, byCourse, bySchoolYear, administratorName, statusSummary, totals.total]);

  const recent = useMemo(() => {
    return recentEnrollments.map((entry) => ({
      id: entry.id,
      student_name: entry.student ?? 'Unnamed Student',
      student_id: entry.id_number ?? entry.student_id ?? '—',
      program: formatProgramLabel(entry) || '—',
      code: entry.code || entry.course_code || 'N/A',
      course_code: entry.course_code || entry.code || 'N/A',
      major: entry.major || null,
      year_level: entry.year_level || '—',
      semester: entry.semester || '—',
      school_year: entry.school_year || '—',
      status: entry.status ?? '—',
      gender: entry.gender || 'unknown',
      campus: entry.campus || '—',
      recorded_at: entry.enrolled_at ? new Date(entry.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
    }));
  }, [recentEnrollments]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(['all']);
    recent.forEach((entry) => {
      if (entry.status && entry.status !== '—') {
        statuses.add(entry.status);
      }
    });
    return Array.from(statuses);
  }, [recent]);

  const yearOptions = useMemo(() => {
    const years = new Set(['all']);
    recent.forEach((entry) => {
      if (entry.year_level && entry.year_level !== '—') {
        years.add(entry.year_level);
      }
    });
    return Array.from(years).sort();
  }, [recent]);

  const programOptions = useMemo(() => {
    const programs = new Set(['all']);
    recent.forEach((entry) => {
      if (entry.program && entry.program !== '—') {
        programs.add(entry.program);
      }
    });
    return Array.from(programs).sort();
  }, [recent]);

  const semesterOptions = useMemo(() => {
    const semesters = new Set(['all']);
    recent.forEach((entry) => {
      if (entry.semester && entry.semester !== '—') {
        semesters.add(entry.semester);
      }
    });
    return Array.from(semesters).sort();
  }, [recent]);



  const schoolYearOptions = useMemo(() => {
    const schoolYears = new Set(['all']);
    recent.forEach((entry) => {
      if (entry.school_year && entry.school_year !== '—') {
        schoolYears.add(entry.school_year);
      }
    });
    return Array.from(schoolYears).sort();
  }, [recent]);

  const filteredStatusEntries = useMemo(() => {
    const entries = Object.entries(summary.by_status || {});
    if (statusFilter === 'all') return entries;
    return entries.filter(([status]) => status === statusFilter);
  }, [summary, statusFilter]);

  const filteredYearEntries = useMemo(() => {
    const entries = summary.by_year || [];
    if (yearFilter === 'all') return entries;
    return entries.filter((row) => row.year_level === yearFilter);
  }, [summary, yearFilter]);

  const filteredRecent = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return recent.filter((row) => {
      const matchesStatus = statusFilter === 'all' || (row.status || '').toLowerCase() === statusFilter.toLowerCase();
      const matchesYear = yearFilter === 'all' || row.year_level === yearFilter;
      const matchesProgram = programFilter === 'all' || row.program === programFilter;
      const matchesSemester = semesterFilter === 'all' || row.semester === semesterFilter;
      const matchesSchoolYear = schoolYearFilter === 'all' || row.school_year === schoolYearFilter;
      const matchesTerm =
        term === '' ||
        (row.student_name || '').toLowerCase().includes(term) ||
        (row.student_id || '').toLowerCase().includes(term) ||
        (row.program || '').toLowerCase().includes(term) ||
        (row.campus || '').toLowerCase().includes(term) ||
        (row.code || '').toLowerCase().includes(term);

      return matchesStatus && matchesYear && matchesProgram && matchesSemester && matchesSchoolYear && matchesTerm;
    });
  }, [recent, statusFilter, yearFilter, programFilter, semesterFilter, schoolYearFilter, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRecent.length / itemsPerPage);
  const paginatedRecent = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredRecent.slice(startIndex, endIndex);
  }, [filteredRecent, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filteredRecent.length]);

  const totalStatusCount = useMemo(() => formatSummaryTotals(Object.entries(summary.by_status || {})), [summary]);
  const totalFiltered = useMemo(() => {
    if (statusFilter === 'all') return summary.total ?? formatSummaryTotals(filteredStatusEntries);
    return formatSummaryTotals(filteredStatusEntries);
  }, [summary, filteredStatusEntries, statusFilter]);

  const topStatus = useMemo(() => {
    if (!summary.by_status) return null;
    return Object.entries(summary.by_status).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0] || null;
  }, [summary]);

  const topYear = useMemo(() => {
    if (!summary.by_year) return null;
    return [...summary.by_year].sort((a, b) => (b.total || 0) - (a.total || 0))[0] || null;
  }, [summary]);

  const getPercent = (value, total) => {
    if (!total) return 0;
    return Math.round(((Number(value) || 0) / total) * 100);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setYearFilter('all');
    setProgramFilter('all');
    setSemesterFilter('all');
    setSchoolYearFilter('all');
    setSearchTerm('');
  };

  const currentFilterSummary = `Status: ${statusFilter === 'all' ? 'All' : statusFilter} • Year Level: ${yearFilter === 'all' ? 'All' : yearFilter} • Semester: ${semesterFilter === 'all' ? 'All' : semesterFilter} • School Year: ${schoolYearFilter === 'all' ? 'All' : schoolYearFilter} • Program: ${programFilter === 'all' ? 'All' : programFilter} • Search: ${searchTerm ? `"${searchTerm}"` : 'None'}`;

  const exportRows = useMemo(() =>
    filteredRecent.map((row) => ({
      Student: row.student_name || 'Unnamed',
      ID: row.student_id || '—',
      Program: row.program || '—',
      Year: row.year_level || '—',
      Status: row.status || '—',
      Recorded: row.recorded_at || '—',
    })),
    [filteredRecent]
  );

  const templateRows = useMemo(() => {
    return summary.by_program || [];
  }, [summary.by_program]);

  const templateMeta = useMemo(() => {
    const meta = summary.meta || {};
    
    // Always use ALUBIJID as default campus
    const campus = 'ALUBIJID';

    // Use filtered semester and year if applied
    const semester = semesterFilter !== 'all' 
      ? semesterFilter 
      : (activeEnrollmentPeriod?.semester || meta.semester || 'All Semesters');
      
    const schoolYear = schoolYearFilter !== 'all'
      ? schoolYearFilter
      : (activeEnrollmentPeriod?.school_year || meta.school_year || 'All Years');

    return {
      campus: campus,
      semester: semester,
      schoolYear: schoolYear,
      preparedBy: meta.prepared_by || '—',
      preparedRole: meta.prepared_role || 'Administrator',
      date: meta.date || new Date().toLocaleDateString(),
      filters: {
        status: statusFilter !== 'all' ? statusFilter : null,
        semester: semesterFilter !== 'all' ? semesterFilter : null,
        year: yearFilter !== 'all' ? yearFilter : null,
        schoolYear: schoolYearFilter !== 'all' ? schoolYearFilter : null,
        program: programFilter !== 'all' ? programFilter : null,
        search: searchTerm || null,
      }
    };
  }, [summary.meta, activeEnrollmentPeriod, semesterFilter, yearFilter, schoolYearFilter, statusFilter, programFilter, searchTerm]);

  const handleExportPDF = () => {
    const generatePDF = async () => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 20;
      let cursorY = 16;

      const logo = await loadLogoImage();
      if (logo) {
        doc.addImage(logo, 'PNG', marginX - 4, cursorY - 4, 14, 14);
      }

      doc.setFont('Times', 'Bold');
      doc.setFontSize(13);
      doc.text('BUKIDNON STATE UNIVERSITY', pageWidth / 2, cursorY, { align: 'center' });
      doc.setFont('Times', 'Normal');
      doc.setFontSize(10);
      doc.text('Malaybalay City, Bukidnon 8700', pageWidth / 2, cursorY + 5, { align: 'center' });
      doc.text(
        'Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph',
        pageWidth / 2,
        cursorY + 9,
        { align: 'center' }
      );

      doc.setFont('Times', 'Bold');
      doc.setFontSize(12);
      doc.text('ENROLLMENT REPORT FOR SATELLITE CAMPUS', pageWidth / 2, cursorY + 16, { align: 'center' });
      doc.setFont('Times', 'Normal');
      doc.setFontSize(9);
      doc.text(
        `CAMPUS: ${templateMeta.campus}     Semester: ${templateMeta.semester}     S.Y.: ${templateMeta.schoolYear}`,
        pageWidth / 2,
        cursorY + 21,
        { align: 'center' }
      );

      // Add filter information if filters are applied
      let filterText = [];
      if (templateMeta.filters.status) filterText.push(`Status: ${templateMeta.filters.status}`);
      if (templateMeta.filters.semester) filterText.push(`Semester: ${templateMeta.filters.semester}`);
      if (templateMeta.filters.year) filterText.push(`Year Level: ${templateMeta.filters.year}`);
      if (templateMeta.filters.schoolYear) filterText.push(`School Year: ${templateMeta.filters.schoolYear}`);
      if (templateMeta.filters.campus) filterText.push(`Campus: ${templateMeta.filters.campus}`);
      if (templateMeta.filters.program) filterText.push(`Program: ${templateMeta.filters.program}`);
      if (templateMeta.filters.search) filterText.push(`Search: "${templateMeta.filters.search}"`);
      
      if (filterText.length > 0) {
        doc.setFontSize(7);
        doc.setFont('Times', 'Italic');
        doc.text(`Filters Applied: ${filterText.join(' • ')}`, pageWidth / 2, cursorY + 21, { align: 'center' });
        cursorY += 4;
      }

      // Build year level/course breakdown table
      const yearLevelCourseData = {};
      const allPrograms = new Set();

      filteredRecent.forEach((entry) => {
        const yearLevel = entry.year_level || 'Unassigned';
        const courseCode = entry.code || entry.course_code || 'N/A';
        const major = entry.major ? ` ${entry.major}` : '';
        const program = `${courseCode}${major}`;
        const gender = (entry.gender || '').toLowerCase();

        if (!yearLevelCourseData[yearLevel]) {
          yearLevelCourseData[yearLevel] = {};
        }
        if (!yearLevelCourseData[yearLevel][program]) {
          yearLevelCourseData[yearLevel][program] = { male: 0, female: 0, total: 0 };
        }

        if (gender === 'male' || gender === 'm') {
          yearLevelCourseData[yearLevel][program].male += 1;
        } else if (gender === 'female' || gender === 'f') {
          yearLevelCourseData[yearLevel][program].female += 1;
        }

        yearLevelCourseData[yearLevel][program].total = yearLevelCourseData[yearLevel][program].male + yearLevelCourseData[yearLevel][program].female;
        allPrograms.add(program);
      });

      const tableStartY = cursorY + 23;

      // Build table headers and body - organized by year level
      const headers = ['COURSE/YEAR', 'MALE', 'FEMALE', 'TOTAL'];
      const tableBody = [];

      // Sort year levels
      const sortedYearLevels = Object.keys(yearLevelCourseData).sort();

      sortedYearLevels.forEach((yearLevel) => {
        const programs = yearLevelCourseData[yearLevel];
        
        // Add each course under the year level
        Object.entries(programs).forEach(([course, data]) => {
          tableBody.push([
            `${course} ${yearLevel}`,
            data.male.toString(),
            data.female.toString(),
            data.total.toString()
          ]);
        });

        // Add subtotal for this year level
        let yearTotalMale = 0, yearTotalFemale = 0, yearTotal = 0;
        Object.values(programs).forEach((data) => {
          yearTotalMale += data.male;
          yearTotalFemale += data.female;
          yearTotal += data.total;
        });
        tableBody.push([
          `TOTAL ${yearLevel}`,
          yearTotalMale.toString(),
          yearTotalFemale.toString(),
          yearTotal.toString()
        ]);
      });

      // Add grand total row
      let grandTotalMale = 0, grandTotalFemale = 0, grandTotal = 0;
      Object.values(yearLevelCourseData).forEach((programs) => {
        Object.values(programs).forEach((data) => {
          grandTotalMale += data.male;
          grandTotalFemale += data.female;
          grandTotal += data.total;
        });
      });
      tableBody.push([
        'TOTAL ENROLLMENT',
        grandTotalMale.toString(),
        grandTotalFemale.toString(),
        grandTotal.toString()
      ]);

      autoTable(doc, {
        startY: tableStartY,
        head: [headers],
        body: tableBody,
        styles: { fontSize: 9, font: 'Times', halign: 'center', cellPadding: 2.5 },
        headStyles: { fontStyle: 'bold', fillColor: [200, 200, 200], textColor: 0, fontSize: 10 },
        bodyStyles: { textColor: 20 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          if (pageCount === 1) return;
        },
      });

      const tableEndY = doc.lastAutoTable.finalY + 6;
      doc.setFont('Times', 'Italic');
      doc.setFontSize(7);
      doc.text('Add rows if necessary', marginX, tableEndY);

      const signatureY = tableEndY + 10;
      doc.setFont('Times', 'Normal');
      doc.setFontSize(8);
      doc.text('Prepared by:', marginX, signatureY);
      doc.setFont('Times', 'Bold');
      doc.text(templateMeta.preparedBy, marginX, signatureY + 4);
      doc.setFont('Times', 'Normal');
      doc.setFontSize(7);
      doc.text(templateMeta.preparedRole, marginX, signatureY + 7);
      doc.text('(signature over printed name)', marginX, signatureY + 10);

      const pdfDate = templateMeta.date?.replace(/\//g, '-') || new Date().toLocaleDateString().replace(/\//g, '-');
      doc.save(`Enrollment Report - ${pdfDate}.pdf`);
    };

    generatePDF();
  };

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const metadataRows = [
      ['BUKIDNON STATE UNIVERSITY'],
      ['Malaybalay City, Bukidnon 8700'],
      ['Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph'],
      ['ENROLLMENT REPORT'],
      [`Campus: ${templateMeta.campus}    Semester: ${templateMeta.semester}    S.Y.: ${templateMeta.schoolYear}`],
      [currentFilterSummary],
      [`Generated: ${templateMeta.date}`],
      [],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(metadataRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: metadataRows.length,
      skipHeader: false,
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');
    const excelDate = (templateMeta.date || new Date().toLocaleDateString()).replace(/\//g, '-');
    XLSX.writeFile(workbook, `Enrollment Report - ${excelDate}.xlsx`);
  };

  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank', 'width=1024,height=768');
    if (!printWindow) return;

    // Build year level/course breakdown table - same as PDF
    const yearLevelCourseData = {};
    
    filteredRecent.forEach((entry) => {
      const yearLevel = entry.year_level || 'Unassigned';
      const courseCode = entry.code || entry.course_code || 'N/A';
      const major = entry.major ? ` ${entry.major}` : '';
      const program = `${courseCode}${major}`;
      const gender = (entry.gender || '').toLowerCase();

      if (!yearLevelCourseData[yearLevel]) {
        yearLevelCourseData[yearLevel] = {};
      }
      if (!yearLevelCourseData[yearLevel][program]) {
        yearLevelCourseData[yearLevel][program] = { male: 0, female: 0, total: 0 };
      }

      if (gender === 'male' || gender === 'm') {
        yearLevelCourseData[yearLevel][program].male += 1;
      } else if (gender === 'female' || gender === 'f') {
        yearLevelCourseData[yearLevel][program].female += 1;
      }

      yearLevelCourseData[yearLevel][program].total = yearLevelCourseData[yearLevel][program].male + yearLevelCourseData[yearLevel][program].female;
    });

    // Sort year levels
    const sortedYearLevels = Object.keys(yearLevelCourseData).sort();

    // Build table rows
    let tableRows = '';
    sortedYearLevels.forEach((yearLevel) => {
      const programs = yearLevelCourseData[yearLevel];
      
      // Add each course under the year level
      Object.entries(programs).forEach(([course, data]) => {
        tableRows += `
          <tr>
            <td>${course} ${yearLevel}</td>
            <td class="text-center">${data.male}</td>
            <td class="text-center">${data.female}</td>
            <td class="text-center">${data.total}</td>
          </tr>`;
      });

      // Add subtotal for this year level
      let yearTotalMale = 0, yearTotalFemale = 0, yearTotal = 0;
      Object.values(programs).forEach((data) => {
        yearTotalMale += data.male;
        yearTotalFemale += data.female;
        yearTotal += data.total;
      });
      tableRows += `
        <tr style="font-weight: bold; background-color: #f1f5f9;">
          <td>TOTAL ${yearLevel}</td>
          <td class="text-center">${yearTotalMale}</td>
          <td class="text-center">${yearTotalFemale}</td>
          <td class="text-center">${yearTotal}</td>
        </tr>`;
    });

    // Add grand total row
    let grandTotalMale = 0, grandTotalFemale = 0, grandTotal = 0;
    Object.values(yearLevelCourseData).forEach((programs) => {
      Object.values(programs).forEach((data) => {
        grandTotalMale += data.male;
        grandTotalFemale += data.female;
        grandTotal += data.total;
      });
    });
    tableRows += `
      <tr style="font-weight: bold; background-color: #e2e8f0;">
        <td>TOTAL ENROLLMENT</td>
        <td class="text-center">${grandTotalMale}</td>
        <td class="text-center">${grandTotalFemale}</td>
        <td class="text-center">${grandTotal}</td>
      </tr>`;

    // Build filter text if filters are applied
    let filterText = [];
    if (templateMeta.filters.status) filterText.push(`Status: ${templateMeta.filters.status}`);
    if (templateMeta.filters.semester) filterText.push(`Semester: ${templateMeta.filters.semester}`);
    if (templateMeta.filters.year) filterText.push(`Year Level: ${templateMeta.filters.year}`);
    if (templateMeta.filters.schoolYear) filterText.push(`School Year: ${templateMeta.filters.schoolYear}`);
    if (templateMeta.filters.campus) filterText.push(`Campus: ${templateMeta.filters.campus}`);
    if (templateMeta.filters.program) filterText.push(`Program: ${templateMeta.filters.program}`);
    if (templateMeta.filters.search) filterText.push(`Search: "${templateMeta.filters.search}"`);

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>Enrollment Report</title>
    <style>
      @page { size: landscape; margin: 15mm; }
      body { font-family: "Times New Roman", Times, serif; color: #000; margin: 0; padding: 20px; }
      .header { text-align: center; margin-bottom: 20px; }
      .header h1 { font-size: 16px; margin: 5px 0; font-weight: bold; }
      .header .university { font-size: 14px; font-weight: bold; margin: 5px 0; }
      .header .meta { font-size: 11px; margin: 2px 0; }
      .header .title { font-size: 13px; font-weight: bold; margin: 10px 0 5px 0; }
      .header .filters { font-size: 9px; font-style: italic; margin: 5px 0; color: #333; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
      th, td { border: 1px solid #000; padding: 6px 8px; }
      th { background: #c8c8c8; text-align: center; font-weight: bold; }
      td { text-align: left; }
      .text-center { text-align: center; }
      .signature { margin-top: 30px; font-size: 10px; }
      .signature .name { font-weight: bold; margin-top: 5px; }
      .signature .note { font-size: 9px; font-style: italic; margin-top: 15px; }
      @media print {
        body { padding: 0; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="university">BUKIDNON STATE UNIVERSITY</div>
      <div class="meta">Malaybalay City, Bukidnon 8700</div>
      <div class="meta">Tel (088) 813-5661 to 5663; TeleFax (088) 813-2717, www.buksu.edu.ph</div>
      <div class="title">ENROLLMENT REPORT FOR SATELLITE CAMPUS</div>
      <div class="meta">CAMPUS: ${templateMeta.campus} &nbsp;&nbsp;&nbsp; Semester: ${templateMeta.semester} &nbsp;&nbsp;&nbsp; S.Y.: ${templateMeta.schoolYear}</div>
      ${filterText.length > 0 ? `<div class="filters">Filters Applied: ${filterText.join(' • ')}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>COURSE/YEAR</th>
          <th>MALE</th>
          <th>FEMALE</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="4" class="text-center">No enrollment data available.</td></tr>`}
      </tbody>
    </table>

    <div class="signature">
      <div class="note">Add rows if necessary</div>
      <div style="margin-top: 20px;">Prepared by:</div>
      <div class="name">${templateMeta.preparedBy}</div>
      <div>${templateMeta.preparedRole}</div>
      <div style="font-size: 9px; margin-top: 5px;">(signature over printed name)</div>
    </div>
  </body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }, [filteredRecent, templateMeta]);

  return (
    <AdminLayout>
      <Head title="Enrollment Report" />
      <div className="space-y-3 p-3 sm:p-5 bg-slate-50 min-h-screen">
        {/* Header Section */}
        <header className="bg-white rounded-lg shadow-sm border border-slate-200 px-5 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Enrollment Report</h1>
              <p className="text-xs text-slate-500 mt-1">
                {activeEnrollmentPeriod 
                  ? `${activeEnrollmentPeriod.semester} • ${activeEnrollmentPeriod.school_year}` 
                  : 'Comprehensive enrollment statistics'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-400"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                disabled={!exportRows.length}
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100"
                disabled={!exportRows.length}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </button>
            </div>
          </div>
        </header>

        {/* Filters Section */}
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, ID, program, campus, or code..."
                className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-md text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? '• Status' : option}
                  </option>
                ))}
              </select>

              <select
                value={semesterFilter}
                onChange={(event) => setSemesterFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {semesterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? '• Semester' : option}
                  </option>
                ))}
              </select>

              <select
                value={schoolYearFilter}
                onChange={(event) => setSchoolYearFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {schoolYearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? '• School Year' : option}
                  </option>
                ))}
              </select>

              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {yearOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? '• Year Level' : option}
                  </option>
                ))}
              </select>

              <select
                value={programFilter}
                onChange={(event) => setProgramFilter(event.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-md text-slate-700 bg-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {programOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? '• Program' : option}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filters & Actions Row */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-200">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-blue-900 text-sm">×</button>
                  </span>
                )}
                {semesterFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-200">
                    Semester: {semesterFilter}
                    <button onClick={() => setSemesterFilter('all')} className="hover:text-purple-900 text-sm">×</button>
                  </span>
                )}
                {schoolYearFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium border border-indigo-200">
                    S.Y.: {schoolYearFilter}
                    <button onClick={() => setSchoolYearFilter('all')} className="hover:text-indigo-900 text-sm">×</button>
                  </span>
                )}
                {yearFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-200">
                    Year: {yearFilter}
                    <button onClick={() => setYearFilter('all')} className="hover:text-amber-900 text-sm">×</button>
                  </span>
                )}
                {programFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-pink-50 text-pink-700 rounded text-[10px] font-medium border border-pink-200">
                    Program: {programFilter}
                    <button onClick={() => setProgramFilter('all')} className="hover:text-pink-900 text-sm">×</button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-300">
                    "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="hover:text-slate-900 text-sm">×</button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  {filteredRecent.length} / {recentEnrollments.length}
                </span>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  disabled={
                    statusFilter === 'all' &&
                    yearFilter === 'all' &&
                    programFilter === 'all' &&
                    semesterFilter === 'all' &&
                    schoolYearFilter === 'all' &&
                    !searchTerm
                  }
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Enrollment Activity Table */}
        <section className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">ID Number</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Program</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Year</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecent.length > 0 ? (
                  paginatedRecent.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium text-slate-800">{row.student_name || 'Unnamed'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] text-slate-600">{row.student_id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-700">{row.program || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-700">{row.year_level || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-medium ${
                            row.status?.toLowerCase() === 'enrolled'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : row.status?.toLowerCase() === 'unenrolled'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[11px] text-slate-500">{row.recorded_at || '—'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <svg className="w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-[11px] font-medium">No enrollment records found</p>
                        <p className="text-[10px] mt-0.5">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer with Pagination */}
          {filteredRecent.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredRecent.length)}</span> of <span className="font-semibold text-slate-900">{filteredRecent.length}</span>
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-slate-700">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Last
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
