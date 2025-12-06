import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { 
  House, 
  BookOpen, 
  Users, 
  Notebook, 
  Calendar, 
  Plus, 
  DotsThree, 
  Chats, 
  PaperPlaneTilt, 
  FileText,
  File,
  UploadSimple,
  ListChecks,
  Clock,
  UserCircle,
  CheckCircle
} from 'phosphor-react';

const ClassView = ({ classData }) => {
  const [activeTab, setActiveTab] = useState('stream');
  const [announcement, setAnnouncement] = useState('');
  
  // Sample data - replace with actual props
  const classInfo = classData || {
    id: 1,
    name: 'BS Information Technology 4A',
    subject: 'Capstone Project 2',
    section: 'IT 4A',
    room: 'CS Lab 3',
    students: 35,
    code: 'abc123',
    theme: 'bg-blue-600',
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'classwork':
        return <ClassworkTab />;
      case 'people':
        return <PeopleTab />;
      case 'grades':
        return <GradesTab />;
      default:
        return <StreamTab />;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className={`${classInfo.theme} text-white p-4 shadow-md`}>
        <div className="container mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{classInfo.name}</h1>
              <p className="text-blue-100">{classInfo.subject} • {classInfo.section} • {classInfo.room}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-black/10 rounded-full">
                <DotsThree size={24} weight="bold" />
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <nav className="mt-4 flex space-x-1">
            <button
              onClick={() => setActiveTab('stream')}
              className={`px-4 py-2 rounded-t-lg flex items-center space-x-2 ${
                activeTab === 'stream' ? 'bg-white text-blue-700' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <House size={20} weight={activeTab === 'stream' ? 'fill' : 'regular'} />
              <span>Stream</span>
            </button>
            <button
              onClick={() => setActiveTab('classwork')}
              className={`px-4 py-2 rounded-t-lg flex items-center space-x-2 ${
                activeTab === 'classwork' ? 'bg-white text-blue-700' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <BookOpen size={20} weight={activeTab === 'classwork' ? 'fill' : 'regular'} />
              <span>Classwork</span>
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-4 py-2 rounded-t-lg flex items-center space-x-2 ${
                activeTab === 'people' ? 'bg-white text-blue-700' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Users size={20} weight={activeTab === 'people' ? 'fill' : 'regular'} />
              <span>People</span>
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`px-4 py-2 rounded-t-lg flex items-center space-x-2 ${
                activeTab === 'grades' ? 'bg-white text-blue-700' : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Notebook size={20} weight={activeTab === 'grades' ? 'fill' : 'regular'} />
              <span>Grades</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {activeTab === 'stream' && (
              <div className="mb-6">
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <UserCircle size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={announcement}
                        onChange={(e) => setAnnouncement(e.target.value)}
                        placeholder="Share with your class..."
                        className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex space-x-2">
                          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <File size={20} />
                          </button>
                          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                            <UploadSimple size={20} />
                          </button>
                        </div>
                        <button 
                          className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 flex items-center"
                          disabled={!announcement.trim()}
                        >
                          <PaperPlaneTilt size={18} className="mr-1" />
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sample Posts */}
                <div className="space-y-4">
                  <ClassPost 
                    author="You" 
                    time="2 hours ago" 
                    content="Welcome to our class! This is where we'll post important announcements and updates." 
                    attachments={[]}
                  />
                  <ClassPost 
                    author="John Doe" 
                    time="1 day ago" 
                    content="When is our first assignment due?" 
                    attachments={[]}
                    isStudent={true}
                  />
                </div>
              </div>
            )}
            
            {renderTabContent()}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-lg mb-3">Class Code</h3>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex justify-between items-center">
                <code className="font-mono text-blue-800">{classInfo.code}</code>
                <button className="text-blue-600 hover:text-blue-800">
                  <FileText size={20} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">Share this code with students to join</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-lg mb-3">Upcoming</h3>
              <div className="space-y-3">
                <UpcomingItem 
                  title="Assignment 1: Project Proposal"
                  due="Due: Tomorrow, 11:59 PM"
                  course={classInfo.name}
                />
                <UpcomingItem 
                  title="Quiz 1: Introduction"
                  due="Due: Friday, 11:59 PM"
                  course={classInfo.name}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Component for class posts
const ClassPost = ({ author, time, content, attachments = [], isStudent = false }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${isStudent ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
          {isStudent ? <User size={20} /> : <UserCircle size={20} />}
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-semibold">{author}</span>
              <span className="text-sm text-gray-500 ml-2">{time}</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <DotsThree size={20} />
            </button>
          </div>
          <p className="mt-1 text-gray-800">{content}</p>
          
          {attachments.length > 0 && (
            <div className="mt-3 border rounded-lg overflow-hidden">
              {attachments.map((file, index) => (
                <div key={index} className="p-3 border-b last:border-b-0 flex items-center hover:bg-gray-50">
                  <FileText size={20} className="text-gray-500 mr-2" />
                  <span className="text-sm text-gray-700 flex-1">{file.name}</span>
                  <a href={file.url} className="text-blue-500 hover:underline text-sm">
                    View
                  </a>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-3 pt-2 border-t flex space-x-4">
            <button className="flex items-center text-gray-500 hover:text-blue-600 text-sm">
              <Chats size={18} className="mr-1" />
              <span>Comment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for upcoming items
const UpcomingItem = ({ title, due, course }) => {
  return (
    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
      <div className="flex items-start">
        <div className="bg-blue-100 p-2 rounded-lg mr-3">
          <ListChecks size={20} className="text-blue-600" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500 flex items-center">
            <Clock size={14} className="mr-1" />
            {due}
          </p>
          <p className="text-xs text-gray-400 mt-1">{course}</p>
        </div>
      </div>
    </div>
  );
};

// Tab Components
const StreamTab = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">Class Stream</h2>
    {/* Stream content will be dynamically generated */}
  </div>
);

const ClassworkTab = () => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold">Classwork</h2>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
        <Plus size={18} className="mr-1" />
        Create
      </button>
    </div>
    
    <div className="space-y-4">
      <ClassworkItem 
        type="assignment"
        title="Assignment 1: Project Proposal"
        due="Due: Tomorrow, 11:59 PM"
        points={100}
        submitted={true}
      />
      <ClassworkItem 
        type="quiz"
        title="Quiz 1: Introduction"
        due="Due: Friday, 11:59 PM"
        points={50}
        submitted={false}
      />
    </div>
  </div>
);

const ClassworkItem = ({ type, title, due, points, submitted }) => (
  <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start">
      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
        {type === 'assignment' ? <FileText size={24} /> : <ListChecks size={24} />}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <div className="flex flex-wrap items-center text-sm text-gray-500 mt-1">
          <span className="mr-4">{due}</span>
          <span className="mr-4">{points} points</span>
          {submitted ? (
            <span className="text-green-600 flex items-center">
              <CheckCircle size={16} className="mr-1" /> Submitted
            </span>
          ) : (
            <span className="text-amber-600">Not submitted</span>
          )}
        </div>
      </div>
      <button className="text-gray-400 hover:text-gray-600">
        <DotsThree size={20} />
      </button>
    </div>
  </div>
);

const PeopleTab = () => (
  <div>
    <h2 className="text-xl font-semibold mb-4">People</h2>
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-medium">Teachers</h3>
      </div>
      <div className="divide-y">
        <PersonItem 
          name="You" 
          email="teacher@example.com" 
          role="Teacher" 
          isYou={true} 
        />
      </div>
      
      <div className="p-4 border-b border-t-4 border-t-gray-100">
        <h3 className="font-medium">Students ({/* Dynamic count */}35)</h3>
      </div>
      <div className="divide-y">
        <PersonItem 
          name="John Doe" 
          email="john.doe@student.buksu.edu.ph" 
          role="Student" 
        />
        <PersonItem 
          name="Jane Smith" 
          email="jane.smith@student.buksu.edu.ph" 
          role="Student" 
        />
        {/* More students would be mapped here */}
      </div>
    </div>
  </div>
);

const PersonItem = ({ name, email, role, isYou = false }) => (
  <div className="p-4 hover:bg-gray-50 flex items-center justify-between">
    <div className="flex items-center">
      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium mr-3">
        {name.split(' ').map(n => n[0]).join('').toUpperCase()}
      </div>
      <div>
        <div className="font-medium">
          {name} {isYou && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2">You</span>}
        </div>
        <div className="text-sm text-gray-500">{email}</div>
      </div>
    </div>
    <div className="text-sm text-gray-500">{role}</div>
  </div>
);

const GradesTab = () => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold">Grades</h2>
      <div className="flex space-x-2">
        <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
          Settings
        </button>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Gradebook
        </button>
      </div>
    </div>
    
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="font-medium">Assignments</h3>
      </div>
      <div className="divide-y">
        <GradeItem 
          title="Assignment 1: Project Proposal" 
          due="Due: Tomorrow, 11:59 PM"
          average={85.5}
          maxPoints={100}
        />
        <GradeItem 
          title="Quiz 1: Introduction" 
          due="Due: Friday, 11:59 PM"
          average={0}
          maxPoints={50}
          noSubmissions={true}
        />
      </div>
    </div>
  </div>
);

const GradeItem = ({ title, due, average, maxPoints, noSubmissions = false }) => (
  <div className="p-4 hover:bg-gray-50">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{due}</p>
      </div>
      <div className="text-right">
        {noSubmissions ? (
          <span className="text-sm text-gray-500">No submissions yet</span>
        ) : (
          <>
            <div className="font-medium">{average}%</div>
            <div className="text-xs text-gray-500">Class average</div>
          </>
        )}
      </div>
    </div>
    {!noSubmissions && (
      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full" 
          style={{ width: `${Math.min(100, average)}%` }}
        ></div>
      </div>
    )}
  </div>
);

export default ClassView;
