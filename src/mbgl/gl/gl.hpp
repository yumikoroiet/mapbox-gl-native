#pragma once

#include <mbgl/gl/gl_function_pointers.hpp>

namespace mbgl {
namespace gl {

/**
 * @brief Get the global table of OpenGL function pointers.
 *
 * @return Table of OpenGL function pointers.
 */
const GLFunctionPointers &getGLFunctionPointers();

/**
 * @brief Set the global table of OpenGL function pointers.
 *
 * @param pointers Table of OpenGL function pointers.
 */
void setGLFunctionPointers(const GLFunctionPointers &pointers);

} // namespace gl
} // namespace mbgl
