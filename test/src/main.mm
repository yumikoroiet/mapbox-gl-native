#include <mbgl/test.hpp>

#import <Foundation/Foundation.h>

namespace mbgl {
namespace gl {

void glLoader();

} // gl
} // mbgl

int main(int argc, char* argv[]) {
    mbgl::gl::glLoader();

    [[NSFileManager defaultManager] changeCurrentDirectoryPath:[[NSBundle mainBundle] bundlePath]];
    return mbgl::runTests(argc, argv);
}
