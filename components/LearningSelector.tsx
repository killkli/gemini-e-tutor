import React from 'react';

interface LearningSelectorProps {
    selectedGrade: number;
    selectedSubject: 'english' | 'chinese';
    onGradeChange: (grade: number) => void;
    onSubjectChange: (subject: 'english' | 'chinese') => void;
}

const LearningSelector: React.FC<LearningSelectorProps> = ({
    selectedGrade,
    selectedSubject,
    onGradeChange,
    onSubjectChange,
}) => {
    const grades = [3, 4, 5, 6, 7, 8, 9];

    return (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center p-4 bg-white/5 rounded-xl backdrop-blur-sm border border-white/10 mb-6 animate-fade-in">
            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300 font-medium">年級：</label>
                <div className="flex gap-1">
                    {grades.map((grade) => (
                        <button
                            key={grade}
                            onClick={() => onGradeChange(grade)}
                            className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${selectedGrade === grade
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110'
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                                }`}
                        >
                            {grade}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden sm:block"></div>

            <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300 font-medium">科目：</label>
                <div className="flex bg-white/10 rounded-lg p-1">
                    <button
                        onClick={() => onSubjectChange('english')}
                        className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${selectedSubject === 'english'
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        English
                    </button>
                    <button
                        onClick={() => onSubjectChange('chinese')}
                        className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${selectedSubject === 'chinese'
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        國語
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LearningSelector;
