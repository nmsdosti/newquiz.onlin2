import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Save, Plus, Minus } from "lucide-react";
import { supabase } from "../../../supabase/supabase";
import { useAuth } from "../auth/VercelAuthProvider";
import { useToast } from "@/components/ui/use-toast";
import Logo from "@/components/ui/logo";
import { Link } from "react-router-dom";
import UserMenu from "@/components/ui/user-menu";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  timeLimit: number;
  options: Option[];
}

interface QuizData {
  title: string;
  description: string;
  questions: Question[];
}

// Helper function to generate unique IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const CreateQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { quizId } = useParams<{ quizId: string }>();

  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [quizData, setQuizData] = useState<QuizData>({
    title: "",
    description: "",
    questions: [
      {
        id: generateId(),
        text: "",
        timeLimit: 30,
        options: [
          { id: generateId(), text: "", isCorrect: false },
          { id: generateId(), text: "", isCorrect: false },
        ],
      },
    ],
  });

  // Load quiz data if editing
  useEffect(() => {
    if (quizId) {
      setIsEditing(true);
      loadExistingQuiz(quizId.trim());
    }
  }, [quizId]);

  // Load existing quiz data
  const loadExistingQuiz = async (id: string) => {
    try {
      setInitialLoading(true);

      // Fetch quiz details
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();

      if (quizError)
        throw new Error(`Failed to load quiz: ${quizError.message}`);
      if (!quiz) throw new Error("Quiz not found");

      // Fetch questions with their options
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select(
          `
          *,
          options (*)
        `,
        )
        .eq("quiz_id", id)
        .order("created_at", { ascending: true });

      if (questionsError)
        throw new Error(`Failed to load questions: ${questionsError.message}`);

      // Transform data to match our interface
      const transformedQuestions: Question[] = (questions || []).map((q) => ({
        id: String(q.id),
        text: q.text || "",
        timeLimit: q.time_limit || 30,
        options: (q.options || []).map((opt: any) => ({
          id: String(opt.id),
          text: opt.text || "",
          isCorrect: opt.is_correct || false,
        })),
      }));

      setQuizData({
        title: quiz.title || "",
        description: quiz.description || "",
        questions:
          transformedQuestions.length > 0
            ? transformedQuestions
            : [
                {
                  id: generateId(),
                  text: "",
                  timeLimit: 30,
                  options: [
                    { id: generateId(), text: "", isCorrect: false },
                    { id: generateId(), text: "", isCorrect: false },
                  ],
                },
              ],
      });
    } catch (error: any) {
      console.error("Error loading quiz:", error);
      toast({
        title: "Error loading quiz",
        description: error.message || "Failed to load quiz data",
        variant: "destructive",
      });
      navigate("/host");
    } finally {
      setInitialLoading(false);
    }
  };

  // Update quiz title
  const updateTitle = (title: string) => {
    setQuizData((prev) => ({ ...prev, title }));
  };

  // Update quiz description
  const updateDescription = (description: string) => {
    setQuizData((prev) => ({ ...prev, description }));
  };

  // Add new question
  const addQuestion = () => {
    const newQuestion: Question = {
      id: generateId(),
      text: "",
      timeLimit: 30,
      options: [
        { id: generateId(), text: "", isCorrect: false },
        { id: generateId(), text: "", isCorrect: false },
      ],
    };
    setQuizData((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  };

  // Remove question
  const removeQuestion = (questionId: string) => {
    if (quizData.questions.length <= 1) {
      toast({
        title: "Cannot remove question",
        description: "Quiz must have at least one question",
        variant: "destructive",
      });
      return;
    }
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  };

  // Update question
  const updateQuestion = (
    questionId: string,
    field: keyof Question,
    value: any,
  ) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, [field]: value } : q,
      ),
    }));
  };

  // Add option to question
  const addOption = (questionId: string) => {
    const question = quizData.questions.find((q) => q.id === questionId);
    if (!question) return;

    if (question.options.length >= 10) {
      toast({
        title: "Maximum options reached",
        description: "A question can have maximum 10 options",
        variant: "destructive",
      });
      return;
    }

    const newOption: Option = {
      id: generateId(),
      text: "",
      isCorrect: false,
    };

    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId ? { ...q, options: [...q.options, newOption] } : q,
      ),
    }));
  };

  // Remove option from question
  const removeOption = (questionId: string, optionId: string) => {
    const question = quizData.questions.find((q) => q.id === questionId);
    if (!question) return;

    if (question.options.length <= 2) {
      toast({
        title: "Cannot remove option",
        description: "A question must have at least 2 options",
        variant: "destructive",
      });
      return;
    }

    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((opt) => opt.id !== optionId) }
          : q,
      ),
    }));
  };

  // Update option
  const updateOption = (
    questionId: string,
    optionId: string,
    field: keyof Option,
    value: any,
  ) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) =>
                opt.id === optionId ? { ...opt, [field]: value } : opt,
              ),
            }
          : q,
      ),
    }));
  };

  // Set correct option (only one can be correct per question)
  const setCorrectOption = (questionId: string, optionId: string) => {
    setQuizData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((opt) => ({
                ...opt,
                isCorrect: opt.id === optionId,
              })),
            }
          : q,
      ),
    }));
  };

  // Validation
  const validateQuiz = (): boolean => {
    // Check title
    if (!quizData.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a quiz title",
        variant: "destructive",
      });
      return false;
    }

    // Check questions
    if (quizData.questions.length === 0) {
      toast({
        title: "No questions",
        description: "Quiz must have at least one question",
        variant: "destructive",
      });
      return false;
    }

    // Validate each question
    for (let i = 0; i < quizData.questions.length; i++) {
      const question = quizData.questions[i];
      const questionNum = i + 1;

      // Check question text
      if (!question.text.trim()) {
        toast({
          title: `Question ${questionNum} incomplete`,
          description: "Please enter question text",
          variant: "destructive",
        });
        return false;
      }

      // Check time limit
      if (question.timeLimit < 5 || question.timeLimit > 120) {
        toast({
          title: `Question ${questionNum} invalid time`,
          description: "Time limit must be between 5 and 120 seconds",
          variant: "destructive",
        });
        return false;
      }

      // Check options
      if (question.options.length < 2) {
        toast({
          title: `Question ${questionNum} needs more options`,
          description: "Each question must have at least 2 options",
          variant: "destructive",
        });
        return false;
      }

      // Check if all options have text
      const emptyOptions = question.options.filter((opt) => !opt.text.trim());
      if (emptyOptions.length > 0) {
        toast({
          title: `Question ${questionNum} has empty options`,
          description: "Please fill in all option texts",
          variant: "destructive",
        });
        return false;
      }

      // Check if there's a correct answer
      const correctOptions = question.options.filter((opt) => opt.isCorrect);
      if (correctOptions.length === 0) {
        toast({
          title: `Question ${questionNum} needs correct answer`,
          description: "Please select the correct answer",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  // Save quiz to Supabase - SIMPLIFIED VERSION
  const saveQuiz = async () => {
    console.log("Starting save process...");

    if (!validateQuiz()) {
      console.log("Validation failed");
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to save the quiz",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let savedQuizId: string;

      if (isEditing && quizId) {
        // Update existing quiz
        console.log("Updating existing quiz:", quizId);

        const { error: updateError } = await supabase
          .from("quizzes")
          .update({
            title: quizData.title.trim(),
            description: quizData.description.trim(),
          })
          .eq("id", quizId.trim());

        if (updateError) {
          console.error("Update error:", updateError);
          throw updateError;
        }

        savedQuizId = quizId.trim();

        // Delete existing questions
        await supabase.from("questions").delete().eq("quiz_id", savedQuizId);
      } else {
        // Create new quiz
        console.log("Creating new quiz...");

        const quizPayload = {
          title: quizData.title.trim(),
          description: quizData.description.trim(),
          user_id: user.id,
        };

        console.log("Quiz payload:", quizPayload);

        const { data: newQuiz, error: createError } = await supabase
          .from("quizzes")
          .insert(quizPayload)
          .select("id")
          .single();

        console.log("Quiz creation response:", {
          data: newQuiz,
          error: createError,
        });

        if (createError) {
          console.error("Quiz creation error:", createError);
          throw createError;
        }

        if (!newQuiz?.id) {
          throw new Error("No quiz ID returned from database");
        }

        savedQuizId = String(newQuiz.id);
        console.log("Created quiz with ID:", savedQuizId);
      }

      // Insert questions and options
      console.log("Saving questions...");

      for (const question of quizData.questions) {
        console.log("Saving question:", question.text.substring(0, 50));

        // Insert question
        const { data: savedQuestion, error: questionError } = await supabase
          .from("questions")
          .insert({
            quiz_id: savedQuizId,
            text: question.text.trim(),
            time_limit: question.timeLimit,
          })
          .select("id")
          .single();

        if (questionError) {
          console.error("Question error:", questionError);
          throw questionError;
        }

        if (!savedQuestion?.id) {
          throw new Error("No question ID returned");
        }

        console.log("Created question with ID:", savedQuestion.id);

        // Insert options
        const optionsToInsert = question.options.map((option) => ({
          question_id: String(savedQuestion.id),
          text: option.text.trim(),
          is_correct: option.isCorrect,
        }));

        const { error: optionsError } = await supabase
          .from("options")
          .insert(optionsToInsert);

        if (optionsError) {
          console.error("Options error:", optionsError);
          throw optionsError;
        }

        console.log("Saved options for question", savedQuestion.id);
      }

      console.log("All data saved successfully!");

      toast({
        title: isEditing ? "Quiz updated!" : "Quiz created!",
        description: isEditing
          ? "Your quiz has been updated successfully"
          : "Your quiz has been created successfully",
      });

      // Navigate back to host page
      setTimeout(() => {
        navigate("/host");
      }, 1000);
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error saving quiz",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get option colors
  const getOptionColor = (index: number): string => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
      "bg-orange-500",
      "bg-gray-500",
    ];
    return colors[index % colors.length];
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-white pt-16 pb-12">
        <div className="w-full bg-white flex justify-between items-center px-6 py-4 shadow-md fixed top-0 left-0 right-0 z-50">
          <Link to="/">
            <Logo className="h-12 w-auto ml-16" />
          </Link>
          <UserMenu />
        </div>
        <div className="max-w-4xl mx-auto px-4 mt-16">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
              <p className="text-gray-600">Loading quiz data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-16 pb-12">
      <div className="w-full bg-white flex justify-between items-center px-6 py-4 shadow-md fixed top-0 left-0 right-0 z-50">
        <Link to="/">
          <Logo className="h-12 w-auto ml-16" />
        </Link>
        <UserMenu />
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-16">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? "Edit Quiz" : "Create New Quiz"}
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/host")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={saveQuiz}
              disabled={loading}
              className="bg-navy hover:bg-navy/90 gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Quiz"}
            </Button>
          </div>
        </div>

        {/* Quiz Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quiz Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title *
              </label>
              <Input
                id="title"
                value={quizData.title}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Enter quiz title"
                maxLength={200}
                disabled={loading}
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description (optional)
              </label>
              <Textarea
                id="description"
                value={quizData.description}
                onChange={(e) => updateDescription(e.target.value)}
                placeholder="Enter quiz description"
                maxLength={1000}
                rows={3}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-6">
          {quizData.questions.map((question, qIndex) => (
            <Card key={question.id} className="border-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(question.id)}
                  disabled={loading || quizData.questions.length === 1}
                  className="h-8 w-8 text-gray-500 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Question Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text *
                  </label>
                  <Textarea
                    value={question.text}
                    onChange={(e) =>
                      updateQuestion(question.id, "text", e.target.value)
                    }
                    placeholder="Enter your question (can be lengthy)"
                    maxLength={2000}
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Limit (seconds) *
                  </label>
                  <Input
                    type="number"
                    min="5"
                    max="120"
                    value={question.timeLimit}
                    onChange={(e) =>
                      updateQuestion(
                        question.id,
                        "timeLimit",
                        parseInt(e.target.value) || 30,
                      )
                    }
                    className="w-32"
                    disabled={loading}
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Answer Options * (2-10 options)
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(question.id)}
                        disabled={loading || question.options.length >= 10}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add Option
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={option.id}
                        className={`p-4 rounded-xl ${getOptionColor(optIndex)} text-white flex items-center gap-3`}
                      >
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={option.isCorrect}
                          onChange={() =>
                            setCorrectOption(question.id, option.id)
                          }
                          disabled={loading}
                          className="h-4 w-4 text-white"
                        />
                        <Textarea
                          value={option.text}
                          onChange={(e) =>
                            updateOption(
                              question.id,
                              option.id,
                              "text",
                              e.target.value,
                            )
                          }
                          placeholder={`Option ${optIndex + 1} (can be lengthy)`}
                          maxLength={500}
                          rows={2}
                          disabled={loading}
                          className="flex-1 bg-white/20 border-none text-white placeholder:text-white/60 focus:ring-white/50 resize-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(question.id, option.id)}
                          disabled={loading || question.options.length <= 2}
                          className="h-8 w-8 text-white hover:text-red-200 hover:bg-white/20"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500">
                    Select the radio button next to the correct answer. Options:{" "}
                    {question.options.length}/10
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add Question Button */}
          <Button
            onClick={addQuestion}
            variant="outline"
            disabled={loading}
            className="w-full py-6 border-dashed border-2 flex items-center justify-center gap-2 hover:bg-gray-50"
          >
            <PlusCircle className="h-5 w-5" />
            Add Question
          </Button>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={saveQuiz}
              disabled={loading}
              className="bg-navy hover:bg-navy/90 gap-2 text-lg px-8 py-6 h-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  {isEditing ? "Update Quiz" : "Save Quiz"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;
