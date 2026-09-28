import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.window = { location: { hostname: "localhost" } };
const { paginateCourses } = await import("./Frontend/js/pages/courses.js");

const courses = Array.from({ length: 14 }, (_, index) => index + 1);
assert.deepEqual(paginateCourses(courses, 1), { page: 1, pageCount: 3, courses: [1, 2, 3, 4, 5, 6] });
assert.deepEqual(paginateCourses(courses, 2).courses, [7, 8, 9, 10, 11, 12]);
assert.deepEqual(paginateCourses(courses, 3).courses, [13, 14]);
assert.deepEqual(paginateCourses(courses.slice(0, 12), 3), { page: 2, pageCount: 2, courses: [7, 8, 9, 10, 11, 12] });
assert.deepEqual(paginateCourses(courses.slice(0, 6), 1), { page: 1, pageCount: 1, courses: [1, 2, 3, 4, 5, 6] });
assert.deepEqual(paginateCourses([], 4), { page: 1, pageCount: 1, courses: [] });
assert.match(await readFile("Frontend/css/course.css", "utf8"), /button:hover:not\(:disabled\):not\(\.active\)/);

console.log("Course pagination checks passed");
