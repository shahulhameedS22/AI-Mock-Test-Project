import { generateMockExamQuestions } from './flows/generate-mock-exam-questions-flow';

console.log('starting testFlow script');

(async () => {
  try {
    console.log('calling generateMockExamQuestions');
    const res = await generateMockExamQuestions({
      studentId: 'test',
      examType: 'SBI PO',
      categories: {
        reasoning: 35,
        aptitude: 35,
        english: 30,
      },
      difficultyLevel: 'easy',
    });
    console.log('RESULT', res);
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    console.log('script finished');
  }
})();
