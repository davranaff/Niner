export type AdminLessonCategory = {
  id: number;
  title: string;
  slug: string;
};

export type AdminLesson = {
  id: number;
  categoryId: number;
  title: string;
  videoLink: string;
};

export type AdminLessonCategoryFormValues = {
  title: string;
  slug: string;
};

export type AdminLessonFormValues = {
  categoryId: number;
  title: string;
  videoLink: string;
};
