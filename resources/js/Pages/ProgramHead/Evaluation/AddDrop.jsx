import React, { useState, useMemo } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import ProgramHeadLayout from '@/Layouts/ProgramHeadLayout';
import { Plus, X, Minus, Search, AlertCircle, ArrowLeft } from 'lucide-react';

export default function AddDrop({ auth, enrollment, availableSubjects = [], enrolledSubjects = [] }) {
    const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
    const [showDropPickerModal, setShowDropPickerModal] = useState(false);
    const [showDropSubjectModal, setShowDropSubjectModal] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dropSearchQuery, setDropSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dropSubject, setDropSubject] = useState(null);

    const curriculumSubjects = useMemo(() => {
        const unique = new Map();
        availableSubjects.forEach(subject => {
            const key = subject.curriculum_subject_id || subject.id;
            if (!unique.has(key)) {
                unique.set(key, subject);
            }
        });
        return Array.from(unique.values());
    }, [availableSubjects]);

    // Memoize enrolledSubjectIds and availableForAdding to prevent unnecessary recalculations
    const enrolledSubjectIds = useMemo(() => 
        enrolledSubjects.map(sub => sub.curriculum_subject_id || sub.id),
        [enrolledSubjects]
    );

    const availableForAdding = useMemo(() =>
        curriculumSubjects.map(subject => ({
            ...subject,
            alreadyEnrolled: enrolledSubjectIds.includes(subject.curriculum_subject_id || subject.id)
        })),
        [curriculumSubjects, enrolledSubjectIds]
    );

    const curriculumById = useMemo(() => {
        const map = new Map();
        curriculumSubjects.forEach(subject => {
            const key = subject.curriculum_subject_id || subject.id;
            map.set(key, subject);
        });
        return map;
    }, [curriculumSubjects]);

    // Group subjects by year level
    const subjectsByYearLevel = useMemo(() => {
        const groupsMap = new Map();

        const resolveYearInfo = (subject) => {
            const curriculumSubject = curriculumById.get(subject.curriculum_subject_id || subject.id);
            const source = curriculumSubject || subject;

            const yearLevelId = source?.year_level_id ?? source?.year_level?.id ?? source?.yearLevel?.id ?? null;
            const yearLevelName = source?.yearLevel?.name
                || source?.yearLevel
                || source?.year_level?.year_level
                || source?.year_level?.name
                || (typeof yearLevelId === 'number' ? `${yearLevelId}${yearLevelId === 1 ? 'st' : yearLevelId === 2 ? 'nd' : yearLevelId === 3 ? 'rd' : 'th'} Year` : 'Unassigned');

            return {
                yearLevelId,
                yearLevelName: yearLevelName || 'Unassigned'
            };
        };

        const ensureGroup = (yearLevelId, yearLevelName) => {
            const key = yearLevelId ?? yearLevelName;
            if (!groupsMap.has(key)) {
                groupsMap.set(key, {
                    yearLevel: yearLevelName,
                    yearLevelId: yearLevelId,
                    subjects: []
                });
            }
            return groupsMap.get(key);
        };

        const pushSubject = (subject, type) => {
            const { yearLevelId, yearLevelName } = resolveYearInfo(subject);
            const group = ensureGroup(yearLevelId, yearLevelName);

            const normalizeSchedules = () => {
                if (Array.isArray(subject.class_schedules)) return subject.class_schedules;
                if (subject.class_schedules) return [subject.class_schedules];
                if (subject.class_schedule) return [subject.class_schedule];
                return [];
            };

            const normalized = {
                ...subject,
                class_schedules: normalizeSchedules(),
                type,
                alreadyEnrolled: Boolean(subject.alreadyEnrolled)
            };

            if (!group.subjects.some(existing => (existing.curriculum_subject_id || existing.id) === (normalized.curriculum_subject_id || normalized.id))) {
                group.subjects.push(normalized);
            }
        };

        enrolledSubjects.forEach(subject => pushSubject(subject, 'enrolled'));
        availableForAdding.forEach(subject => pushSubject(subject, 'available'));

        return Array.from(groupsMap.values()).sort((a, b) => {
            const aId = a.yearLevelId ?? Number.MAX_SAFE_INTEGER;
            const bId = b.yearLevelId ?? Number.MAX_SAFE_INTEGER;
            if (aId !== bId) {
                return aId - bId;
            }
            return a.yearLevel.localeCompare(b.yearLevel);
        });
    }, [enrolledSubjects, availableForAdding, curriculumById]);

    const enrolledSubjectGroups = useMemo(
        () =>
            subjectsByYearLevel.map(group => ({
                ...group,
                subjects: group.subjects.filter(subject => subject.type === 'enrolled')
            })),
        [subjectsByYearLevel]
    );

    const formatScheduleDisplay = (schedules) => {
        if (!schedules || !Array.isArray(schedules) || schedules.length === 0) return 'No schedule';
        
        return schedules
            .map(schedule => {
                if (!schedule) return '';
                const day = schedule.day || schedule.schedule_day || '';
                const start = schedule.start_time || '';
                const end = schedule.end_time || '';
                const room = schedule.room?.name || schedule.room_name || 'TBA';
                const faculty = schedule.faculty ? 
                    `${schedule.faculty.lName || ''}, ${schedule.faculty.fName || ''}${schedule.faculty.mName ? ' ' + schedule.faculty.mName[0] + '.' : ''}` 
                    : 'TBA';
                
                return `${day} ${start}-${end} • ${room} • ${faculty}`;
            })
            .filter(Boolean)
            .join('; ');
    };

    const getSubjectIdentifier = (subject) => subject?.curriculum_subject_id || subject?.id;

    const resolveClassScheduleId = (subject) =>
        subject?.class_schedule_id ||
        subject?.class_schedules?.[0]?.id ||
        subject?.class_schedule?.id ||
        null;

    const handleAddSubject = (subject) => {
        if (subject.alreadyEnrolled) {
            if (window?.toast?.info) {
                window.toast.info('This subject is already part of the current load.');
            } else {
                alert('This subject is already part of the current load.');
            }
            return;
        }

        if (subject.class_schedules?.length > 1) {
            // If multiple schedules, show selection
            setShowAddSubjectModal(true);
            setSelectedSubjects(prev => {
                const subjectId = getSubjectIdentifier(subject);
                if (prev.some(existing => getSubjectIdentifier(existing) === subjectId && existing.type === 'add')) {
                    return prev;
                }

                return [...prev, { ...subject, type: 'add', alreadyEnrolled: false }];
            });
        } else {
            // If single or no schedule, add directly
            setSelectedSubjects(prev => {
                const subjectId = getSubjectIdentifier(subject);
                if (prev.some(existing => getSubjectIdentifier(existing) === subjectId && existing.type === 'add')) {
                    return prev;
                }

                return [
                    ...prev,
                    {
                        ...subject,
                        type: 'add',
                        class_schedule_id: resolveClassScheduleId(subject),
                        alreadyEnrolled: false
                    }
                ];
            });
        }
    };

    const handleDropSubject = (subject) => {
        setDropSubject(subject);
        setShowDropSubjectModal(true);
    };

    const confirmDropSubject = () => {
        if (!dropSubject) return;
        
        setSelectedSubjects(prev => {
            const subjectId = getSubjectIdentifier(dropSubject);
            const classScheduleId = resolveClassScheduleId(dropSubject);
            const existingIndex = prev.findIndex(existing =>
                existing.type === 'drop' &&
                getSubjectIdentifier(existing) === subjectId &&
                (resolveClassScheduleId(existing) || null) === (classScheduleId || null)
            );

            const updatedEntry = {
                ...dropSubject,
                type: 'drop',
                reason: dropSubject.reason || '',
                class_schedule_id: classScheduleId
            };

            if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = { ...next[existingIndex], ...updatedEntry };
                return next;
            }

            return [...prev, updatedEntry];
        });
        setShowDropSubjectModal(false);
        setDropSubject(null);
    };

    const handleRemoveSubject = (index) => {
        setSelectedSubjects(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        if (isSubmitting || selectedSubjects.length === 0) {
            if (selectedSubjects.length === 0) {
                alert('Please select at least one subject to add or drop');
            }
            return;
        }

        // Check if any drop subjects are missing reasons
        const hasMissingDropReasons = selectedSubjects.some(
            subject => subject.type === 'drop' && (!subject.reason || subject.reason.trim() === '')
        );

        if (hasMissingDropReasons) {
            if (window?.toast?.error) {
                window.toast.error('Please provide a reason for dropping subjects');
            } else {
                alert('Please provide a reason for dropping subjects');
            }
            return;
        }

        setIsSubmitting(true);

        const data = {
            enrollment_id: enrollment.id,
            subjects: selectedSubjects.map(subject => ({
                curriculum_subject_id: subject.curriculum_subject_id || subject.id,
                type: subject.type,
                class_schedule_id:
                    subject.class_schedule_id ||
                    subject.class_schedules?.[0]?.id ||
                    subject.class_schedule?.id ||
                    null,
                reason: subject.reason || ''
            }))
        };

        router.post(route('program_head.enrollments.add-drop.process', enrollment.id), data, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedSubjects([]);
                // Refresh the page to show updated data
                router.visit(route('program_head.enrollments.add-drop', enrollment.id), {
                    only: ['enrollment', 'availableSubjects', 'enrolledSubjects'],
                    preserveScroll: true,
                    preserveState: true
                });
            },
            onError: (errors) => {
                console.error('Error submitting form:', errors);
                alert('An error occurred while processing your request. Please try again.');
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    const SubjectCard = ({ subject, isEnrolled, onAdd, onDrop }) => {
        if (!subject) return null;

        const subjectCode = subject.subject_code || subject.subject?.subject_code || 'N/A';
        const subjectTitle = subject.subject_title || subject.subject?.subject_title || 'Untitled Subject';
        const units = Number(subject.units || subject.subject?.units || 0);
        const typeLabel = subject.type === 'drop' ? 'Drop' : 'Add';
        const isAvailable = subject.type === 'available';
        const alreadyEnrolled = isEnrolled || subject.alreadyEnrolled;
        const badgeClass = isEnrolled
            ? 'bg-green-100 text-green-700'
            : alreadyEnrolled
                ? 'bg-gray-100 text-gray-600'
                : isAvailable
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-blue-100 text-blue-700';
        const badgeLabel = isEnrolled ? 'Enrolled' : alreadyEnrolled ? 'Already Enrolled' : typeLabel;
        const disableAdd = alreadyEnrolled;

        const scheduleBadge = formatScheduleDisplay(subject.class_schedules);
        const facultyName = subject.class_schedules?.[0]?.faculty
            ? `${subject.class_schedules[0].faculty?.lName || ''}, ${subject.class_schedules[0].faculty?.fName || ''}`
            : null;

        return (
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{subjectCode}</span>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
                            >
                                {badgeLabel}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                {units} unit{units === 1 ? '' : 's'}
                            </span>
                            {subject.yearLevel && (
                                <span className="rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
                                    {subject.yearLevel || subject.year_level?.name}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-600">{subjectTitle}</p>

                        {scheduleBadge && (
                            <p className="text-[11px] text-gray-500">{scheduleBadge}</p>
                        )}

                        {facultyName && (
                            <p className="text-[11px] text-gray-500">Faculty: {facultyName}</p>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        {isEnrolled ? (
                            <button
                                type="button"
                                onClick={() => onDrop(subject)}
                                className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
                            >
                                <Minus className="mr-1 h-3 w-3" /> Drop
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onAdd(subject)}
                                disabled={disableAdd}
                                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                                    disableAdd
                                        ? 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-400'
                                        : 'border border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:text-blue-800'
                                }`}
                            >
                                <Plus className="mr-1 h-3 w-3" /> Add
                            </button>
                        )}

                    </div>
                </div>
            </div>
        );
    };

    return (
        <ProgramHeadLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Add/Drop Subjects</h2>}
        >
            <Head title="Add/Drop Subjects" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Enrollment Management</p>
                                    <h3 className="mt-1 text-xl font-semibold text-gray-900">Subject Add/Drop</h3>
                                </div>
                                <Link
                                    href={enrollment?.id ? `/program-head/evaluation/${enrollment.id}/subjectload` : '#'}
                                    className={`inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                        enrollment?.id
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400'
                                            : 'cursor-not-allowed bg-gray-100 text-gray-400 focus:ring-gray-200'
                                    }`}
                                    aria-disabled={!enrollment?.id}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subject Loading
                                </Link>
                            </div>

                        </div>

                        <div className="px-5 py-5 space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-base font-semibold text-gray-900">Manage Changes</h4>
                                    <p className="text-xs text-gray-500">Stage additions or drops, then submit once the list below looks correct.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddSubjectModal(true);
                                        }}
                                        className="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Subjects
                                    </button>
                                    {enrolledSubjects.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDropPickerModal(true);
                                            }}
                                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                                        >
                                            <Minus className="mr-2 h-4 w-4" />
                                            Drop Subjects
                                        </button>
                                    )}
                                </div>
                            </div>

                            {selectedSubjects.length > 0 && (
                                <div className="space-y-3.5">
                                    <h4 className="text-sm font-semibold text-gray-900">Staged Changes</h4>
                                    {selectedSubjects.map((subject, index) => {
                                        const subjectCode = subject.subject_code || subject.subject?.subject_code || 'N/A';
                                        const subjectTitle = subject.subject_title || subject.subject?.subject_title || 'N/A';
                                        const units = subject.units || subject.subject?.units || 0;
                                        const isAdd = subject.type === 'add';

                                        return (
                                            <div key={index} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-blue-200">
                                                <div className="flex flex-wrap items-start justify-between gap-2.5">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-sm font-semibold text-gray-900">{subjectCode}</h3>
                                                            <span
                                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                    isAdd
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-red-100 text-red-700'
                                                                }`}
                                                            >
                                                                {isAdd ? 'Add' : 'Drop'}
                                                            </span>
                                                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                                                                {units} unit{Number(units) === 1 ? '' : 's'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-xs text-gray-600">{subjectTitle}</p>

                                                        {!isAdd && (
                                                            <div className="mt-3">
                                                                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                                                    Reason for dropping
                                                                </label>
                                                                <textarea
                                                                    rows={2}
                                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    placeholder="Provide a clear justification"
                                                                    value={subject.reason || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...selectedSubjects];
                                                                        updated[index] = {
                                                                            ...updated[index],
                                                                            reason: e.target.value,
                                                                        };
                                                                        setSelectedSubjects(updated);
                                                                    }}
                                                                    required
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveSubject(index)}
                                                        className="inline-flex items-center rounded-full border border-gray-200 p-1.5 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                                        title="Remove change"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-gray-200 pt-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSubjects([])}
                                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="inline-flex items-center rounded-lg border border-transparent bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {isSubmitting ? 'Processing…' : 'Submit Changes'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selectedSubjects.length === 0 && (
                                <div className="rounded-lg border border-dashed border-gray-200 bg-white py-12 text-center">
                                    <p className="text-sm font-semibold text-gray-900">No staged changes yet</p>
                                    <p className="mt-1 text-xs text-gray-500">Use the actions above to add new subjects or drop existing ones.</p>
                                    <div className="mt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddSubjectModal(true);
                                            }}
                                            className="inline-flex items-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Start Adding Subjects
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showAddSubjectModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-start justify-center px-4 py-6 text-center sm:items-center sm:px-0">
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                            onClick={() => {
                                setShowAddSubjectModal(false);
                                setSearchQuery('');
                            }}
                        ></div>

                        <div className="relative my-8 w-full max-w-2xl transform rounded-lg bg-white text-left shadow-xl transition-all flex max-h-[85vh] flex-col">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1 flex flex-col overflow-hidden min-h-0">
                                <div className="flex h-full flex-col">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Add Subjects</h3>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-500"
                                            onClick={() => {
                                                setShowAddSubjectModal(false);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="mb-4 block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Search subjects..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-1 max-h-[60vh] space-y-5">
                                        {subjectsByYearLevel.map((group, index) => {
                                            const availableSubjects = group.subjects.filter(subject =>
                                                subject.type === 'available' &&
                                                (!searchQuery ||
                                                    (subject.subject_code || '')
                                                        .toLowerCase()
                                                        .includes(searchQuery.toLowerCase()) ||
                                                    (subject.subject_title || '')
                                                        .toLowerCase()
                                                        .includes(searchQuery.toLowerCase()))
                                            );

                                            if (availableSubjects.length === 0) return null;

                                            return (
                                                <div key={index}>
                                                    <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                                                        <span className="font-semibold text-gray-700">{group.yearLevel}</span>
                                                        <span>{availableSubjects.length} subject{availableSubjects.length === 1 ? '' : 's'}</span>
                                                    </div>
                                                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 bg-white">
                                                        {availableSubjects.map(subject => {
                                                            const subjectCode = subject.subject_code || subject.subject?.subject_code || 'N/A';
                                                            const subjectTitle = subject.subject_title || subject.subject?.subject_title || 'Untitled Subject';
                                                            const units = Number(subject.units || subject.subject?.units || 0);
                                                            const isAlreadyStaged = selectedSubjects.some(
                                                                staged =>
                                                                    staged.type === 'add' &&
                                                                    getSubjectIdentifier(staged) === getSubjectIdentifier(subject)
                                                            );
                                                            const disableAdd = subject.alreadyEnrolled || isAlreadyStaged;

                                                            return (
                                                                <li key={`${group.yearLevel}-${getSubjectIdentifier(subject)}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-gray-800">{subjectCode}</span>
                                                                            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500">{units}u</span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500">{subjectTitle}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddSubject(subject)}
                                                                        disabled={disableAdd}
                                                                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                                                                            disableAdd
                                                                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                                                                                : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:text-blue-800'
                                                                        }`}
                                                                    >
                                                                        <Plus className="mr-1 h-3 w-3" /> Add
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            );
                                        })}

                                        {availableForAdding.length === 0 && (
                                            <div className="py-8 text-center">
                                                <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">
                                                    No subjects available
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {searchQuery
                                                        ? 'No matching subjects found.'
                                                        : 'There are no subjects available to add at this time.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                                <button
                                    type="button"
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    onClick={() => {
                                        setShowAddSubjectModal(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDropPickerModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-start justify-center px-4 py-6 text-center sm:items-center sm:px-0">
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                            onClick={() => {
                                setShowDropPickerModal(false);
                                setDropSearchQuery('');
                            }}
                        ></div>

                        <div className="relative my-8 w-full max-w-2xl transform rounded-lg bg-white text-left shadow-xl transition-all flex max-h-[85vh] flex-col">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1 flex flex-col overflow-hidden min-h-0">
                                <div className="flex h-full flex-col">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-lg font-medium text-gray-900">Drop Subjects</h3>
                                        <button
                                            type="button"
                                            className="text-gray-400 hover:text-gray-500"
                                            onClick={() => {
                                                setShowDropPickerModal(false);
                                                setDropSearchQuery('');
                                            }}
                                        >
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="mb-4 block w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm leading-5 placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Search enrolled subjects..."
                                            value={dropSearchQuery}
                                            onChange={(e) => setDropSearchQuery(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-1 max-h-[60vh] space-y-5">
                                        {enrolledSubjectGroups.map((group, index) => {
                                            const enrolledInGroup = group.subjects.filter(subject => {
                                                if (subject.type !== 'enrolled') return false;
                                                if (!dropSearchQuery) return true;
                                                const query = dropSearchQuery.toLowerCase();
                                                return (
                                                    (subject.subject_code || '').toLowerCase().includes(query) ||
                                                    (subject.subject_title || subject.subject?.subject_title || '').toLowerCase().includes(query)
                                                );
                                            });

                                            if (enrolledInGroup.length === 0) return null;

                                            return (
                                                <div key={index}>
                                                    <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                                                        <span className="font-semibold text-gray-700">{group.yearLevel}</span>
                                                        <span>{enrolledInGroup.length} subject{enrolledInGroup.length === 1 ? '' : 's'}</span>
                                                    </div>
                                                    <ul className="divide-y小 divide-gray-100 overflow-hidden rounded-lg border border-gray-100 bg-white">
                                                        {enrolledInGroup.map(subject => {
                                                            const subjectCode = subject.subject_code || subject.subject?.subject_code || 'N/A';
                                                            const subjectTitle = subject.subject_title || subject.subject?.subject_title || 'Untitled Subject';
                                                            const units = Number(subject.units || subject.subject?.units || 0);
                                                            const isAlreadyStaged = selectedSubjects.some(
                                                                staged =>
                                                                    staged.type === 'drop' &&
                                                                    getSubjectIdentifier(staged) === getSubjectIdentifier(subject)
                                                            );

                                                            return (
                                                                <li key={`${group.yearLevel}-${getSubjectIdentifier(subject)}`} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                                                                    <div className="space-y-0.5">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-semibold text-gray-800">{subjectCode}</span>
                                                                            <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500">{units}u</span>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500">{subjectTitle}</p>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (isAlreadyStaged) return;
                                                                            setShowDropPickerModal(false);
                                                                            setDropSearchQuery('');
                                                                            handleDropSubject(subject);
                                                                        }}
                                                                        disabled={isAlreadyStaged}
                                                                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                                                                            isAlreadyStaged
                                                                                ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                                                                                : 'border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:text-red-700'
                                                                        }`}
                                                                    >
                                                                        <Minus className="mr-1 h-3 w-3" /> Drop
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            );
                                        })}

                                        {enrolledSubjects.length === 0 && (
                                            <div className="py-8 text-center">
                                                <AlertCircle className="mx-auto h-10 w-10 text-gray-400" />
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">
                                                    No enrolled subjects available
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    There are currently no subjects to drop.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
                                <button
                                    type="button"
                                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    onClick={() => {
                                        setShowDropPickerModal(false);
                                        setDropSearchQuery('');
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDropSubjectModal && dropSubject && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4 py-6 text-center sm:px-0">
                        <div
                            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                            onClick={() => {
                                setShowDropSubjectModal(false);
                                setDropSubject(null);
                            }}
                        ></div>

                        <div className="relative my-8 w-full max-w-lg transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <AlertCircle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">Drop Subject</h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Are you sure you want to drop{' '}
                                                <span className="font-medium">
                                                    {dropSubject.subject_code || dropSubject.subject?.subject_code} -{' '}
                                                    {dropSubject.subject_title || dropSubject.subject?.subject_title}
                                                </span>
                                                ?
                                            </p>
                                            <div className="mt-4">
                                                <label htmlFor="dropReason" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Reason for dropping <span className="text-red-500">*</span>
                                                </label>
                                                <div>
                                                    <textarea
                                                        id="dropReason"
                                                        rows={3}
                                                        className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
                                                        placeholder="Please provide a reason for dropping this subject"
                                                        value={dropSubject.reason || ''}
                                                        onChange={(e) => setDropSubject({ ...dropSubject, reason: e.target.value })}
                                                        required
                                                    />
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Please provide a reason for dropping this subject.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="button"
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={confirmDropSubject}
                                    >
                                        Confirm Drop
                                    </button>
                                    <button
                                        type="button"
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                        onClick={() => {
                                            setShowDropSubjectModal(false);
                                            setDropSubject(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ProgramHeadLayout>
    );
}
