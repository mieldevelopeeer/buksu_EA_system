# Faculty Grade Report - Debugging Guide

## Issue: Empty Grade Report with No Sections/Subjects

### Current Status
The Faculty Grade Report is showing empty because either:
1. No data is being returned from the backend
2. Data is being returned but not properly processed in frontend
3. Filters are hiding all data

### Data Flow

#### Backend (FacultyReportsController.php)

**Location**: `app/Http/Controllers/FacultyControllers/FacultyReportsController.php`

**grades() Method** (line 83):
```php
public function grades(Request $request)
{
    $facultyId = Auth::id();
    
    // Fetches class schedules for logged-in faculty
    $scheduleModels = Class_Schedules::with([
        'curriculumSubject.subject',
        'curriculumSubject.course',
        'section',
        'enrollmentSubjects.enrollment.student',
    ])
    ->where('faculty_id', $facultyId)
    ->when($activeSemester, fn ($query) => $query->where('semester_id', $activeSemester->id))
    ->get();
    
    // Returns to frontend
    return Inertia::render('Faculty/Reports/GradeReport', [
        'schedules' => $mappedSchedules,
        'gradeSummaries' => $gradeSummaries,
        'activeSemester' => $activeSemester,
    ]);
}
```

**Data Structure Returned**:

**schedules array**:
```javascript
[
  {
    id: 123,
    curriculum_subject: {
      subject: { descriptive_title, title, code },
      course: { code, name }
    },
    subject: { descriptive_title, title, code, name },
    subject_code: "CS101",
    section: { id, section, name },
    section_name: "BSCS 3A",
    schedule_day: "MWF",
    start_time: "08:00:00",
    end_time: "09:00:00",
    student_count: 35
  }
]
```

**gradeSummaries array**:
```javascript
[
  {
    class_schedule_id: 123,
    reference: { id, schedule_day, start_time, end_time },
    records: [
      {
        enrollment_id: 1,
        student_id: 45,
        student_name: "Doe, John A.",
        midterm: 85.5,
        final: 87.25,  // Already calculated as (midterm + final) / 2
        remarks: "Passed",
        midterm_status: "submitted",
        final_status: "submitted"
      }
    ],
    totals: {
      submitted: 30,
      drafts: 5,
      failing: 2,
      passed: 28
    },
    average: 86.5
  }
]
```

#### Frontend (GradeReport.jsx)

**Location**: `resources/js/Pages/Faculty/Reports/GradeReport.jsx`

**Props Received**:
- `schedules` - Array of class schedules
- `gradeSummaries` - Array of grade summaries per schedule
- `activeSemester` - Active semester info

**Processing Flow**:

1. **scheduleIndex** (line 99): Creates a Map of schedule metadata
   - Keys: schedule.id
   - Values: { subjectName, subjectCode, sectionLabel, courseLabel, etc. }

2. **groupedGrades** (line 134): Maps gradeSummaries to display structure
   - Looks up schedule metadata from scheduleIndex using class_schedule_id
   - Combines schedule info with grade totals and records

3. **Filter Options**:
   - sectionOptions: Built from scheduleIndex
   - subjectOptions: Built from scheduleIndex
   - studentOptions: Built from grade records

### Possible Reasons for Empty Report

#### 1. No Class Schedules for Faculty
**Check**:
```sql
SELECT cs.*, s.section, sub.code, sub.descriptive_title
FROM class_schedules cs
LEFT JOIN sections s ON cs.section_id = s.id
LEFT JOIN curriculum_subject currsub ON cs.curriculum_subject_id = currsub.id
LEFT JOIN subjects sub ON currsub.subject_id = sub.id
WHERE cs.faculty_id = [YOUR_FACULTY_ID];
```

**Solution**: Assign class schedules to the faculty member in the database.

#### 2. No Active Semester
**Check**:
```sql
SELECT sem.*, sy.school_year
FROM semesters sem
JOIN school_year sy ON sem.school_year_id = sy.id
WHERE sem.is_active = 1 AND sy.is_active = 1;
```

**Solution**: Activate a semester and school year.

#### 3. No Grades with Both Midterm AND Final
The backend filters out incomplete grades:
```php
if ($midterm === null || $final === null) {
    return null; // Skip incomplete grades
}
```

**Check**:
```sql
SELECT g.*, es.class_schedule_id, cs.schedule_day
FROM grades g
JOIN enrollment_subject es ON g.enrollment_subject_id = es.id
JOIN class_schedules cs ON es.class_schedule_id = cs.id
WHERE cs.faculty_id = [YOUR_FACULTY_ID]
  AND g.midterm IS NOT NULL
  AND g.final IS NOT NULL;
```

**Solution**: Ensure grades have both midterm and final scores entered.

#### 4. Enrollment Status Not 'enrolled'
**Check**:
```sql
SELECT e.*, es.class_schedule_id, g.midterm, g.final
FROM enrollments e
JOIN enrollment_subject es ON e.id = es.enrollment_id
LEFT JOIN grades g ON es.id = g.enrollment_subject_id
JOIN class_schedules cs ON es.class_schedule_id = cs.id
WHERE cs.faculty_id = [YOUR_FACULTY_ID]
  AND e.status != 'enrolled';
```

**Solution**: Set enrollment status to 'enrolled'.

### Debugging Steps

#### Step 1: Check Browser Console
Open the page and check console for these messages:
```
[FacultyGradeReport] incoming props
  - Schedules count: X
  - Grade Summaries count: Y
[scheduleIndex] Processing schedules: X
[scheduleIndex] Final map size: X
[groupedGrades] Processing summaries: Y
[groupedGrades] Final grouped grades: Y
[sectionOptions] ["all", ...]
[subjectOptions] ["all", ...]
```

#### Step 2: Check Database
Run these queries to verify data exists:

1. **Check your faculty ID**:
```sql
SELECT id, fName, lName FROM users WHERE role = 'faculty' AND email = '[YOUR_EMAIL]';
```

2. **Check schedules**:
```sql
SELECT COUNT(*) as schedule_count
FROM class_schedules cs
WHERE cs.faculty_id = [YOUR_FACULTY_ID];
```

3. **Check grades**:
```sql
SELECT COUNT(*) as grade_count
FROM grades g
JOIN enrollment_subject es ON g.enrollment_subject_id = es.id
JOIN class_schedules cs ON es.class_schedule_id = cs.id
WHERE cs.faculty_id = [YOUR_FACULTY_ID]
  AND g.midterm IS NOT NULL
  AND g.final IS NOT NULL;
```

#### Step 3: Check Route
Ensure you're accessing the correct route:
```
/faculty/reports/grades
```

### Console Debugging Added

The following console logs have been added to help debug:

1. **Props logging**: Shows incoming data counts
2. **scheduleIndex logging**: Shows each schedule being processed
3. **groupedGrades logging**: Shows each summary being mapped
4. **Filter options logging**: Shows available filter options

### Quick Fix Checklist

- [ ] Faculty has class schedules assigned (faculty_id in class_schedules table)
- [ ] Active semester exists (is_active = 1 in both semesters and school_year)
- [ ] Grades have both midterm AND final scores entered
- [ ] Enrollment status is 'enrolled'
- [ ] curriculum_subject exists for each class_schedule
- [ ] Subject and section exist in their respective tables

### Testing Commands

To test if data exists, open browser DevTools Console and check:
```javascript
// Check props
console.log('Schedules:', window.page?.props?.schedules);
console.log('Grade Summaries:', window.page?.props?.gradeSummaries);

// Check if Inertia page data exists
console.log('Page Props:', window.page?.props);
```

### Expected Console Output (When Working)

```
[FacultyGradeReport] incoming props
  Active Semester: {id: 1, semester: "1st Semester", school_year: "2024-2025"}
  Schedules count: 5
  Schedules: (5) [{...}, {...}, ...]
  Grade Summaries count: 5
  Grade Summaries: (5) [{...}, {...}, ...]

[scheduleIndex] Processing schedules: 5
[scheduleIndex] Schedule 123: {subject: "CS101", section: "BSCS 3A", meta: {...}}
[scheduleIndex] Final map size: 5

[groupedGrades] Processing summaries: 5
[groupedGrades] Summary 0: {scheduleId: 123, totals: {...}, recordsCount: 35}
[groupedGrades] Final grouped grades: 5

[sectionOptions] ["all", "BSCS 3A", "BSCS 3B", ...]
[subjectOptions] ["all", "CS101 • Introduction to Programming", ...]
```

### Next Steps

1. Open the Faculty Grade Report page
2. Open Browser DevTools (F12)
3. Check Console tab for the debug messages above
4. Share the console output to identify the exact issue
5. Check database using queries above if counts are 0
