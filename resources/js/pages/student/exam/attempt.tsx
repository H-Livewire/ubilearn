import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Footer from '@/layouts/footer';
import Main from '@/layouts/main';
import examAttempts from '@/routes/exam-attempts';
import AttemptNavbar from './partials/attempt-navbar';
import QuestionNavigator from './partials/question-navigator';
import QuestionRenderer from './partials/question-renderer';
import TimerComponent from './partials/timer-component';

interface Props {
   attempt: ExamAttempt;
   deadline: string;
   savedAnswers: { exam_question_id: number; answer_data: any }[];
}

function loadExamDraftFromStorage(attemptId: number): {
   answers: Record<number, any>;
   marked: Set<number>;
} {
   if (typeof window === 'undefined') {
      return { answers: {}, marked: new Set() };
   }

   const raw = localStorage.getItem(`exam-attempt-${attemptId}`);

   if (!raw) {
      return { answers: {}, marked: new Set() };
   }

   try {
      const parsed = JSON.parse(raw);

      return {
         answers: parsed.answers || {},
         marked: new Set(parsed.marked || []),
      };
   } catch (error) {
      console.error('Failed to load saved answers:', error);

      return { answers: {}, marked: new Set() };
   }
}

const TakeExam = ({ attempt, deadline, savedAnswers }: Props) => {
   const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
   const [answers, setAnswers] = useState<Record<number, any>>(() => ({
      ...Object.fromEntries(
         savedAnswers.map((a) => [a.exam_question_id, a.answer_data]),
      ),
      ...loadExamDraftFromStorage(attempt.id).answers,
   }));
   const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(
      () => loadExamDraftFromStorage(attempt.id).marked,
   );
   const [showSubmitDialog, setShowSubmitDialog] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [saveStatus, setSaveStatus] = useState('Inasubiri kuhifadhi…');
   const inFlight = useRef(false);
   const answersRef = useRef(answers);
   const savedSnapshot = useRef('');
   const computedDeadline = deadline;

   const questions = attempt.exam.questions || [];
   const currentQuestion = questions[currentQuestionIndex];
   const answeredQuestions = new Set(Object.keys(answers).map(Number));

   const saveToLocalStorage = useCallback(() => {
      localStorage.setItem(
         `exam-attempt-${attempt.id}`,
         JSON.stringify({
            answers,
            marked: Array.from(markedQuestions),
            lastSaved: new Date().toISOString(),
         }),
      );
   }, [attempt.id, answers, markedQuestions]);

   // Keep a local recovery copy immediately, then persist the latest draft to the server.
   useEffect(() => {
      answersRef.current = answers;
      saveToLocalStorage();
   }, [answers, saveToLocalStorage]);

   useEffect(() => {
      let mounted = true;
      const save = async () => {
         if (
            inFlight.current ||
            isSubmitting ||
            Date.now() >= new Date(deadline).getTime()
         ) {
return;
}

         const snapshot = JSON.stringify(answersRef.current);

         if (snapshot === savedSnapshot.current) {
return;
}

         inFlight.current = true;

         if (mounted) {
setSaveStatus('Inahifadhi…');
}

         try {
            await axios.post(`/student/exam-attempts/${attempt.id}/draft`, {
               answers: Object.entries(JSON.parse(snapshot)).map(
                  ([id, answer]) => ({
                     exam_question_id: Number(id),
                     answer_data: answer,
                  }),
               ),
            });
            savedSnapshot.current = snapshot;

            if (mounted) {
setSaveStatus(
                  snapshot === JSON.stringify(answersRef.current)
                     ? 'Majibu yamehifadhiwa'
                     : 'Inasubiri kuhifadhi…',
               );
}
         } catch {
            if (mounted) {
setSaveStatus('Haijahifadhiwa kwenye server. Inajaribu tena…');
}
         } finally {
            inFlight.current = false;
         }
      };
      const timeout = setTimeout(save, 1000);
      const interval = setInterval(save, 5000);
      window.addEventListener('online', save);

      return () => {
         mounted = false;
         clearTimeout(timeout);
         clearInterval(interval);
         window.removeEventListener('online', save);
      };
   }, [attempt.id, deadline, isSubmitting]);

   // Warn before leaving page
   useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
         e.preventDefault();
         e.returnValue = '';
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () =>
         window.removeEventListener('beforeunload', handleBeforeUnload);
   }, []);

   const handleAnswerChange = (answer: any) => {
      if (!currentQuestion) {
         return;
      }

      setSaveStatus('Inasubiri kuhifadhi…');
      setAnswers((prev) => ({
         ...prev,
         [currentQuestion.id]: answer,
      }));
   };

   const handlePrevious = () => {
      if (currentQuestionIndex > 0) {
         setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
   };

   const handleNext = () => {
      if (currentQuestionIndex < questions.length - 1) {
         setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
   };

   const handleSubmit = async () => {
      setIsSubmitting(true);
      saveToLocalStorage();

      const formattedAnswers = Object.entries(answers).map(
         ([questionId, value]) => ({
            exam_question_id: Number(questionId),
            answer_data: value,
         }),
      );

      router.post(
         examAttempts.submit(attempt.id),
         {
            exam_attempt_id: attempt.id,
            answers: formattedAnswers,
         },
         {
            onSuccess: () => {
               localStorage.removeItem(`exam-attempt-${attempt.id}`);
            },
            onFinish: () => {
               setIsSubmitting(false);
            },
         },
      );
   };

   // Keyboard shortcuts
   useEffect(() => {
      const handleKeyPress = (e: KeyboardEvent) => {
         if (e.key === 'ArrowRight') {
            setCurrentQuestionIndex((i) =>
               i < questions.length - 1 ? i + 1 : i,
            );
         } else if (e.key === 'ArrowLeft') {
            setCurrentQuestionIndex((i) => (i > 0 ? i - 1 : i));
         }
      };

      window.addEventListener('keydown', handleKeyPress);

      return () => window.removeEventListener('keydown', handleKeyPress);
   }, [questions.length]);

   const unansweredCount = questions.length - answeredQuestions.size;

   return (
      <Main>
         <Head title={`Taking: ${attempt.exam.title}`} />

         <main className="flex min-h-screen flex-col justify-between overflow-x-hidden">
            <p
               role="status"
               aria-live="polite"
               className="bg-background px-4 py-2 text-center text-sm text-muted-foreground"
            >
               {saveStatus}
            </p>
            <AttemptNavbar
               attempt={attempt}
               questionIndex={currentQuestionIndex}
            />

            <div className="container py-12">
               <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                     {/* Main Content */}
                     <div className="space-y-4 lg:col-span-3">
                        {/* Timer */}
                        <TimerComponent
                           key={`${attempt.id}-${computedDeadline}`}
                           attempt={attempt}
                           endTime={computedDeadline}
                           questionIndex={currentQuestionIndex}
                        />

                        {/* Question */}
                        {currentQuestion && (
                           <QuestionRenderer
                              question={currentQuestion}
                              questionNumber={currentQuestionIndex + 1}
                              answer={answers[currentQuestion.id as number]}
                              onAnswerChange={handleAnswerChange}
                           />
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow">
                           <Button
                              onClick={handlePrevious}
                              disabled={currentQuestionIndex === 0}
                              variant="outline"
                           >
                              <ChevronLeft className="mr-2 h-4 w-4" />
                              Previous
                           </Button>

                           {/* <Button onClick={handleMarkForReview} variant={markedQuestions.has(currentQuestion.id as number) ? 'default' : 'outline'}>
                           <Flag className="mr-2 h-4 w-4" />
                           {markedQuestions.has(currentQuestion.id as number) ? 'Unmark' : 'Mark for Review'}
                        </Button> */}

                           {currentQuestionIndex < questions.length - 1 ? (
                              <Button onClick={handleNext}>
                                 Next
                                 <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                           ) : (
                              <Button
                                 onClick={() => setShowSubmitDialog(true)}
                                 variant="default"
                              >
                                 Submit Exam
                              </Button>
                           )}
                        </div>
                     </div>

                     {/* Sidebar */}
                     <div className="lg:col-span-1">
                        <QuestionNavigator
                           questions={questions}
                           currentQuestionIndex={currentQuestionIndex}
                           answeredQuestions={answeredQuestions}
                           markedQuestions={markedQuestions}
                           onNavigate={setCurrentQuestionIndex}
                        />
                     </div>
                  </div>
               </div>

               {/* Submit Confirmation Dialog */}
               <AlertDialog
                  open={showSubmitDialog}
                  onOpenChange={setShowSubmitDialog}
               >
                  <AlertDialogContent>
                     <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                           <AlertTriangle className="h-5 w-5 text-yellow-600" />
                           Submit Exam?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                           <p>
                              Are you sure you want to submit your exam? This
                              action cannot be undone.
                           </p>
                           {unansweredCount > 0 && (
                              <div className="rounded-lg bg-yellow-50 p-3">
                                 <p className="text-sm font-semibold text-yellow-800">
                                    Warning: You have {unansweredCount}{' '}
                                    unanswered question
                                    {unansweredCount > 1 ? 's' : ''}!
                                 </p>
                              </div>
                           )}
                           <div className="text-sm">
                              <p>
                                 <strong>Answered:</strong>{' '}
                                 {answeredQuestions.size} / {questions.length}
                              </p>
                              <p>
                                 <strong>Marked for review:</strong>{' '}
                                 {markedQuestions.size}
                              </p>
                           </div>
                        </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                        <AlertDialogCancel
                           onClick={() => setShowSubmitDialog(false)}
                        >
                           Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                           onClick={handleSubmit}
                           disabled={isSubmitting}
                        >
                           {isSubmitting ? 'Submitting...' : 'Yes, Submit Exam'}
                        </AlertDialogAction>
                     </AlertDialogFooter>
                  </AlertDialogContent>
               </AlertDialog>
            </div>

            <Footer />
         </main>
      </Main>
   );
};

export default TakeExam;
